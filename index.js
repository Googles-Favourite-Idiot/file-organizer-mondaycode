import express from 'express';
import { Logger } from '@mondaycom/apps-sdk';
import { authorizeRequest } from './src/middleware.js';
import {
  getFileColumn,
  assignFileToColumn,
  extractKeywordFromFileName,
} from './src/monday-api-service.js';
import { getSecret, isDevelopmentEnv, getEnv } from './src/helpers.js';
import dotenv from 'dotenv';
import { readQueueMessage, produceMessage } from './src/queue-service.js';
dotenv.config();

const logTag = 'ExpressServer';
const PORT = 'PORT';
const SERVICE_TAG_URL = 'SERVICE_TAG_URL';

const logger = new Logger(logTag);
const currentPort = getSecret(PORT); // Port must be 8080 to work with monday code
const currentUrl = getSecret(SERVICE_TAG_URL);

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send({ message: 'healthy' });
});

app.post('/monday/execute_action', authorizeRequest, async (req, res) => {
  logger.info(
    JSON.stringify({
      message: 'New request received',
      path: '/action',
      body: req.body,
      headers: req.headers,
    })
  );
  const { shortLivedToken } = req.session;
  const { payload } = req.body;

  try {
    const { inputFields } = payload;
    const { boardId, itemId, sourceColumnId, targetColumnId } = inputFields;

    // Get the file name from the source column
    const fileName = await getFileColumn(
      shortLivedToken,
      itemId,
      sourceColumnId
    );
    if (!fileName) {
      return res.status(200).send({});
    }

    // Extract keyword from file name
    const keyword = extractKeywordFromFileName(fileName);

    // Move file to another column based on keyword
    await assignFileToColumn(
      shortLivedToken,
      boardId,
      itemId,
      targetColumnId,
      keyword
    );

    return res.status(200).send({});
  } catch (err) {
    logger.error(err);
    return res.status(500).send({ message: 'internal server error' });
  }
});

app.post('/subscribe', authorizeRequest, async (req, res) => {
  res.status(200).send({});
});

app.post('/unsubscribe', authorizeRequest, async (req, res) => {
  res.status(200).send({});
});

app.post('/produce', async (req, res) => {
  try {
    const { body } = req;
    const message = JSON.stringify(body);
    const messageId = await produceMessage(message);
    return res.status(200).send({ messageId });
  } catch (err) {
    logger.error(JSON.stringify(err));
    return res.status(500).send({ message: 'internal server error' });
  }
});

app.post('/mndy-queue', async (req, res) => {
  try {
    const { body, query } = req;
    readQueueMessage({ body, query });
    return res.status(200).send({}); // return 200 to ACK the queue message
  } catch (err) {
    logger.error(err.error);
    return res.status(500).send({ message: 'internal server error' });
  }
});

app.listen(currentPort, () => {
  if (isDevelopmentEnv()) {
    logger.info(`app running locally on port ${currentPort}`);
  } else {
    logger.info(
      `up and running listening on port:${currentPort}`,
      'server_runner',
      {
        env: getEnv(),
        port: currentPort,
        url: `https://${currentUrl}`,
      }
    );
  }
});
