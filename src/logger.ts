import pino from 'pino';

const axiomDataset = process.env.AXIOM_DATASET;
const axiomToken = process.env.AXIOM_TOKEN;

const logger = axiomDataset && axiomToken
    ? pino(
        { level: 'info' },
        pino.transport({
            target: '@axiomhq/pino',
            options: {
                dataset: axiomDataset,
                token: axiomToken,
            },
        }),
    )
    : pino({ level: 'info' });

export default logger;