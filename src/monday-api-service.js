import initMondayClient from 'monday-sdk-js';
import { Logger } from '@mondaycom/apps-sdk';

const logTag = 'Middleware';
const logger = new Logger(logTag);

// insert new code here
const getFileColumnName = async (token, itemId, fileColumnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setApiVersion('2024-01');
    mondayClient.setToken(token);

    const query = `query($itemId: [ID!], $columnId: [File!]) {
      items(ids: $itemId) {
        column_values(ids: $columnId) {
          id
          value
        }
      }
    }`;
    const variables = { itemId, columnId: [fileColumnId] };

    const response = await mondayClient.api(query, { variables });

    // Extract file name from the response
    const fileName = response.data.items[0].column_values[0].value;

    return fileName;
  } catch (err) {
    logger.error(err);
    return null;
  }
};

export const assignFileToColumn = async (
  token,
  itemId,
  fileColumnId,
  keywordColumnId,
  keyword
) => {
  try {
    const fileName = await getFileColumnName(token, itemId, fileColumnId);
    const fileUrl = await getFileUrl(token, itemId, fileColumnId);
    const columnValue = { files: [{ name: fileName, url: fileUrl }] };

    const mondayClient = initMondayClient();
    mondayClient.setApiVersion('2024-01');
    mondayClient.setToken(token);

    const query = `mutation($itemId: Int!, $columnId: File!, $value: JSON!) {
      change_column_value(item_id: $itemId, column_id: $columnId, value: $value) {
        id
      }
    }`;
    const variables = { itemId, columnId: keywordColumnId, value: columnValue };

    await mondayClient.api(query, { variables });
  } catch (err) {
    logger.error(err);
  }
};

export const extractKeywordFromFileName = (fileName) => {
  // Split the file name by underscore to get an array of parts
  const parts = fileName.split('_');
  // The keyword is the first part of the file name
  const keyword = parts[0];
  // Return the keyword
  return keyword;
};
