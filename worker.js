import { Queue } from 'bull';
import dbClient from './utils/db';
import thumbnailGenerator from 'image-thumbnail';

export const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];

  for (const size of thumbnailSizes) {
    const thumbnailOptions = { width: size };

    const thumbnail = await thumbnailGenerator(file.localPath, thumbnailOptions);

    const thumbnailPath = `${file.localPath}_${size}`;

    fs.writeFileSync(thumbnailPath, thumbnail);
  }
});