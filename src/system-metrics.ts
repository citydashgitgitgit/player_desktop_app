import si, { Systeminformation } from 'systeminformation';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const deviceUuid = fs.readFileSync(path.join(__dirname, '../metadata/device_uuid.txt'), 'utf-8').trim();

interface CpuMetrics {
    model: string;
    cores: number;
    speed: number;
    currentLoad: number;
    temperature: number | undefined;
}

interface MemoryMetrics {
    total: number;
    available: number;
    used: number;
    usedPercent: number;
}

interface DiskMetric {
    fs: string;
    size: number;
    used: number;
    available: number;
    usedPercent: number;
}

interface NetworkMetric {
    iface: string;
    type: string;
    operstate: string;
    speed: number | null;
    bytesReceived: number;
    bytesTransmitted: number;
    packetsReceived: number;
    packetsTransmitted: number;
}

const metricsLogger = pino(
    {
        level: 'info',
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        formatters: {
            level: (label: string) => ({ level: label }),
        },
        base: {
            env: process.env.NODE_ENV || 'development',
            pid: process.pid,
            hostname: require('os').hostname(),
        },
    },
    pino.transport({
        target: '@axiomhq/pino',
        options: {
            dataset: 'system-metrics',
            token: process.env.AXIOM_TOKEN,
        },
    }),
);

const createMetricsContext = (data: Record<string, unknown> = {}) => ({
    ...data,
    deviceUuid,
    timestamp: new Date().toISOString(),
});

export async function collectSystemMetrics(): Promise<void> {
    try {
        const cpu = await si.cpu();
        const cpuLoad = await si.currentLoad();
        const cpuTemp = await si.cpuTemperature();
        const memory = await si.mem();
        const disk = await si.fsSize();
        const networkStats = await si.networkStats();
        const networkInterfaces = await si.networkInterfaces();

        const cpuMetrics: CpuMetrics = {
            model: `${cpu.manufacturer} ${cpu.brand}`,
            cores: cpu.cores,
            speed: cpu.speed,
            currentLoad: cpuLoad.currentLoad,
            temperature: cpuTemp.main
        };

        const memoryMetrics: MemoryMetrics = {
            total: memory.total,
            available: memory.available,
            used: memory.used,
            usedPercent: (memory.used / memory.total) * 100
        };

        const diskMetrics: DiskMetric[] = disk.map(d => ({
            fs: d.fs,
            size: d.size,
            used: d.used,
            available: d.available,
            usedPercent: d.use
        }));

        const networkMetrics: NetworkMetric[] = networkInterfaces
            .filter(iface => iface.operstate === 'up')
            .map((iface, index) => ({
                iface: iface.iface,
                type: iface.type,
                operstate: iface.operstate,
                speed: iface.speed,
                bytesReceived: networkStats[index]?.rx_bytes || 0,
                bytesTransmitted: networkStats[index]?.tx_bytes || 0,
                packetsReceived: networkStats[index]?.rx_dropped || 0,
                packetsTransmitted: networkStats[index]?.tx_dropped || 0
            }));

        metricsLogger.info(createMetricsContext({
            cpu: cpuMetrics,
            memory: memoryMetrics,
            disk: diskMetrics,
            network: networkMetrics,
            action: 'collect_metrics'
        }));

    } catch (error) {
        metricsLogger.error(createMetricsContext({
            message: 'Error collecting system metrics',
            error: error instanceof Error ? error.message : String(error),
            action: 'collect_metrics_error'
        }));
    }
}

export function startMetricsCollection(): void {
    void collectSystemMetrics();
    setInterval(() => void collectSystemMetrics(), 60000);
} 