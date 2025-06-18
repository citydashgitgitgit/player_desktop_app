import pino from 'pino';

const axiomDataset = process.env.AXIOM_DATASET;
const axiomToken = process.env.AXIOM_TOKEN;

const baseLogger = {
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
};

const logger = axiomDataset && axiomToken
    ? pino(
        baseLogger,
        pino.transport({
            target: '@axiomhq/pino',
            options: {
                dataset: axiomDataset,
                token: axiomToken,
            },
        }),
    )
    : pino(baseLogger);

// Helper to ensure consistent log structure
export const createLogContext = (context: string, data: any = {}) => ({
    context,
    ...data,
    timestamp: new Date().toISOString(),
});

export default logger;