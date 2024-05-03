import initMondayClient from 'monday-sdk-js';
import { Logger } from '@mondaycom/apps-sdk';

const logTag = 'Middleware';
const logger = new Logger(logTag);

// insert new code here
export const getFileColumnName = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setApiVersion('2024-01');
    mondayClient.setToken(token);

    const query = `query($itemId: [ID!], $columnId: [String!]) {
      items (ids: $itemId) {
        column_values(ids:$columnId) {
          value
        }
      }
    }`;
    const variables = { columnId, itemId };

    const response = await mondayClient.api(query, { variables });
    return response.data.items[0].column_values[0].value;
  } catch (err) {
    logger.error(err);
  }
};

export const assignFileToColumn = async (
  token,
  itemId,
  fileColumnId,
  keywordColumnId
) => {
  try {
    const fileName = await getFileColumnName(token, itemId, fileColumnId);
    const keyword = extractKeywordFromFileName(fileName);
    const columnValue = keyword ? { files: [fileName] } : null;

    const mondayClient = initMondayClient();
    mondayClient.setApiVersion('2024-01');
    mondayClient.setToken(token);

    const query = `mutation($itemId: Int!, $columnId: String!, $value: JSON!) {
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

const extractKeywordFromFileName = (fileName) => {
  // Split the file name by underscore to get an array of parts
  const parts = fileName.split('_');
  // The keyword is the first part of the file name
  const keyword = parts[0];
  // Return the keyword
  return keyword;
};
