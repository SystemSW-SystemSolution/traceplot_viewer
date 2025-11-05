import { useRef, useState, ChangeEvent } from "react";
import { Scatter, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  ChartOptions,
  ChartData,
  BarElement,
  CategoryScale,
  ArcElement,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import Button from "../../components/ui/button/Button";

ChartJS.register(
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  zoomPlugin,
  BarElement,
  CategoryScale,
  ArcElement,
);

type IOType = "Read" | "Write" | "Discard" | "Flush" | "Other";

interface TracePoint {
  x: number;
  y: number;
  sizeKB: number;
}

interface DatasetEntry {
  label: string;
  data: TracePoint[];
  showLine: boolean;
  pointStyle: string;
  radius: number;
  backgroundColor: string;
}

// 색상과 마커
const COLOR_MAP: Record<IOType, string> = {
  Read: "#e11d48",
  Write: "#3b82f6",
  Discard: "#10b981",
  Flush: "#f97316",
  Other: "#6b7280",
};

const MARKER_LIST = [
  "circle",
  "cross",
  "triangle",
  "rect",
  "star",
  "rectRot",
  "dash",
  "polygon",
] as const;

// 블록 트레이스 정규식
const TRACE_REGEX =
  /(?<timestamp>\d+\.\d+):\s+block_rq_issue:\s+(?<major>\d+),(?<minor>\d+)\s+(?<rwbs>[RWDWFMS]+)\s+(?<size>\d+)?\s*\(\)\s+(?<sector>\d+)\s+\+\s+(?<length>\d+)/gm;

export default function Plot() {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([]);
  const [rawText, setRawText] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [sizeStats, setSizeStats] = useState<any>(null);

  const [stats, setStats] = useState({
    readCount: 0,
    writeCount: 0,
    readKB: 0,
    writeKB: 0,
  });

  const chartRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  /** trace.log 파싱 */
  function parseTrace(text: string) {
    const eventsByDevType = new Map<string, TracePoint[]>();
    let m: RegExpExecArray | null;

    while ((m = TRACE_REGEX.exec(text)) !== null) {
      const groups = m.groups as Record<string, string>;
      const { timestamp, major, minor, rwbs, sector, length } = groups;
      const ts = parseFloat(timestamp);
      const dev = `${major},${minor}`;
      if (dev === "0,0") continue;

      let opType: IOType = "Other";
      if (rwbs.includes("D")) opType = "Discard";
      else if (rwbs.includes("F")) opType = "Flush";
      else if (rwbs.includes("R") && !rwbs.includes("W")) opType = "Read";
      else if (rwbs.includes("W")) opType = "Write";

      const lenKB = (parseInt(length, 10) * 512) / 1024;
      const key = `${dev}|${opType}`;
      if (!eventsByDevType.has(key)) eventsByDevType.set(key, []);
      eventsByDevType.get(key)!.push({ x: ts, y: parseInt(sector, 10), sizeKB: lenKB });
    }
    return eventsByDevType;
  }

  function buildDatasets(map: Map<string, TracePoint[]>) {
    const ds: DatasetEntry[] = [];
    let devIndex = 0;
    const devSeen = new Map<string, number>();

    for (const [key, points] of map.entries()) {
      const [dev, ioType] = key.split("|");
      if (!devSeen.has(dev)) devSeen.set(dev, devIndex++);
      const marker = MARKER_LIST[devSeen.get(dev)! % MARKER_LIST.length];

      ds.push({
        label: `${dev} ${ioType}`,
        data: points,
        showLine: false,
        pointStyle: marker,
        radius: 3,
        backgroundColor: COLOR_MAP[ioType as IOType],
      });
    }
    return ds;
  }

  function computeSizeStats(map: Map<string, TracePoint[]>) {
    const bins = [4, 8, 16, 32, 64, 128, 256];
    const readCount = Object.fromEntries(bins.map(b => [b, 0]));
    const writeCount = Object.fromEntries(bins.map(b => [b, 0]));

    for (const [key, pts] of map.entries()) {
      const isRead = key.includes("Read");
      const isWrite = key.includes("Write");
      for (const p of pts) {
        const bin = bins.find(b => p.sizeKB <= b) ?? 256;
        if (isRead) readCount[bin]++;
        if (isWrite) writeCount[bin]++;
      }
    }
    return { bins, readCount, writeCount };
  }

  /** 파일 로드 */
  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      const map = parseTrace(text);
      setDatasets(buildDatasets(map));
      setSizeStats(computeSizeStats(map));
    };
    reader.readAsText(file);
  }

  function handleParseText() {
    const map = parseTrace(rawText);
    setDatasets(buildDatasets(map));
  }

  function handleApplyTimeFilter() {
    const t0 = timeStart ? parseFloat(timeStart) : null;
    const t1 = timeEnd ? parseFloat(timeEnd) : null;
    const map = parseTrace(rawText);
    const filtered = new Map<string, TracePoint[]>();

    for (const [key, pts] of map.entries()) {
      const filteredPts = pts.filter((p) => {
        if (t0 !== null && p.x < t0) return false;
        if (t1 !== null && p.x > t1) return false;
        return true;
      });
      if (filteredPts.length) filtered.set(key, filteredPts);
    }
    setDatasets(buildDatasets(filtered));
  }

  /** 줌 초기화 */
  function handleResetZoom() {
    const chart = chartRef.current;
    if (chart) chart.resetZoom();
  }

  /** 선택 영역 통계 계산 */
  function handleSelection(ctx: any) {
    const chart = ctx.chart;
    const { x, y } = chart.scales;

    const xMin = x.min;
    const xMax = x.max;
    const yMin = y.min;
    const yMax = y.max;

    let readCount = 0,
      writeCount = 0;

    for (const ds of datasets) {
      const isRead = ds.label.includes("Read");
      const isWrite = ds.label.includes("Write");
      for (const p of ds.data) {
        if (p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax) {
          if (isRead) readCount++;
          if (isWrite) writeCount++;
        }
      }
    }

    const readKB = readCount * 4; // assume 4KB per sector
    const writeKB = writeCount * 4;

    setStats({ readCount, writeCount, readKB, writeKB });
  }

  const data: ChartData<"scatter"> = { datasets };

  const options: ChartOptions<"scatter"> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: "LBA Access Pattern (Marker: Device / Color: I/O Type)",
      },
      zoom: {
        zoom: {
          drag: {
            enabled: true,
            borderColor: "rgba(54,162,235,0.6)",
            borderWidth: 1,
            backgroundColor: "rgba(54,162,235,0.1)",
          },
          mode: "xy",
        },
        pan: {
          enabled: true,
          mode: "xy",
          modifierKey: "ctrl",
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (s)" },
      },
      y: {
        title: { display: true, text: "LBA (Sector)" },
      },
    },
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">LBA Trace Visualizer</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Upload trace.log
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            style={{ display: "none" }} // 완전히 숨김
          />
          <Button
              size="md"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
            Upload File
          </Button>

        </div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Or paste trace text
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            className="w-full p-2 border rounded"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleParseText}
              className="px-3 py-1 rounded bg-sky-600 text-white"
            >
              Parse
            </button>
            <button
              onClick={handleApplyTimeFilter}
              className="px-3 py-1 rounded bg-emerald-600 text-white"
            >
              Apply Time Filter
            </button>
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 rounded bg-amber-500 text-white"
            >
              Reset Zoom
            </button>
          </div>
          <button
            onClick={() => chartRef.current?.toBase64Image()}
            className="mt-2 px-3 py-1 rounded bg-gray-700 text-white"
          >
            Download PNG
          </button>
        </div>

        {/* Time filter */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Time range filter (optional)
          </label>
          <div className="flex gap-2">
            <input
              placeholder="start (s)"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="p-2 border rounded w-1/2"
            />
            <input
              placeholder="end (s)"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="p-2 border rounded w-1/2"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Use decimal seconds, e.g. 1234.567
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[520px] border rounded p-2 bg-white">
        <Scatter ref={chartRef} data={data} options={options} />
      </div>

      {/* Stats */}
      <div className="mt-4 border rounded bg-gray-50 p-4 text-sm">
        <h2 className="font-medium mb-2">Selected Region Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>🧾 Read Count: {stats.readCount}</div>
          <div>🪶 Write Count: {stats.writeCount}</div>
          <div>📦 Read Size: {stats.readKB} KB</div>
          <div>📦 Write Size: {stats.writeKB} KB</div>
        </div>
        <p className="text-gray-500 mt-1">
          (Size assumes 4KB per sector; adjust if needed)
        </p>
      </div>
      {/* 크기별 통계 Bar Chart */}
      {sizeStats && (
        <div className="h-[520px] border rounded p-2 bg-white flex align-center justify-center mt-6">
          <Bar
            data={{
              labels: sizeStats.bins.map((b: any) => `${b}K`),
              datasets: [
                {
                  label: "Read Requests",
                  data: sizeStats.bins.map((b: any) => sizeStats.readCount[b]),
                  backgroundColor: "rgba(239,68,68,0.6)",
                },
                {
                  label: "Write Requests",
                  data: sizeStats.bins.map((b: any) => sizeStats.writeCount[b]),
                  backgroundColor: "rgba(59,130,246,0.6)",
                },
              ],
            }}
            options={{
              plugins: {
                legend: { position: "bottom" },
                title: { display: true, text: "I/O Size Distribution" },
              },
              scales: {
                x: { title: { display: true, text: "Request Size (KB)" } },
                y: { title: { display: true, text: "Count" }, beginAtZero: true },
              },
            }}
          />
        </div>
      )}
            {/* ✅ 두 개의 원형 차트 추가 */}
      {sizeStats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 좌측: Read/Write 개수 비율 */}
          <div className="h-[400px] border rounded p-2 bg-white flex flex-col items-center justify-center">
            <Pie
              data={{
                labels: ["Read", "Write"],
                datasets: [
                  {
                    data: [
                      Object.values(sizeStats.readCount).reduce((a: any, b: any) => a + b, 0),
                      Object.values(sizeStats.writeCount).reduce((a: any, b: any) => a + b, 0),
                    ],
                    backgroundColor: [
                      "rgba(239,68,68,0.6)", // red
                      "rgba(59,130,246,0.6)", // blue
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { position: "bottom" },
                  title: { display: true, text: "Read vs Write Count Ratio" },
                },
              }}
            />
          </div>

          {/* 우측: Request Size 비율 */}
          <div className="h-[400px] border rounded p-2 bg-white flex flex-col items-center justify-center">
            <Pie
              data={{
                labels: sizeStats.bins.map((b: any) => `${b}K`),
                datasets: [
                  {
                    label: "Total Requests",
                    data: sizeStats.bins.map(
                      (b: any) => sizeStats.readCount[b] + sizeStats.writeCount[b]
                    ),
                    backgroundColor: [
                      "#f87171",
                      "#fb923c",
                      "#fbbf24",
                      "#34d399",
                      "#60a5fa",
                      "#a78bfa",
                      "#f472b6",
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { position: "bottom" },
                  title: { display: true, text: "Request Size Ratio" },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
