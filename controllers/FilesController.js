import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

export const postUpload = async (req, res) => {
  const { userId } = req;
  const { name, type, parentId = '0', isPublic = false, data } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  if (!['folder', 'file', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }

  if (!data && type !== 'folder') {
    return res.status(400).json({ error: 'Missing data' });
  }

  const parentFile = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(parentId) });

  if (parentId !== '0' && (!parentFile || parentFile.type !== 'folder')) {
    return res.status(400).json({ error: 'Parent is not a folder' });
  }

  const file = {
    userId: ObjectId(userId),
    name,
    type,
    isPublic,
    parentId,
  };

  if (type === 'folder') {
    const result = await dbClient.client
      .db()
      .collection('files')
      .insertOne(file);

    const { _id: id } = result.ops[0];

    return res.status(201).json({ ...file, id });
  } else {
    const localPath = `${FOLDER_PATH}/${uuidv4()}`;

    const fileBuffer = Buffer.from(data, 'base64');

    fs.writeFileSync(localPath, fileBuffer);

    file.localPath = localPath;

    const result = await dbClient.client
      .db()
      .collection('files')
      .insertOne(file);

    const { _id: id } = result.ops[0];

    return res.status(201).json({ ...file, id });
  }
};

export const getFileById = async (req, res) => {
  const { userId } = req;
  const { id } = req.params;

  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json(file);
};

export const getFilesByParentId = async (req, res) => {
  const { userId } = req;
  const { parentId = '0', page = 0 } = req.query;
  const limit = 20;
  const skip = page * limit;

  const files = await dbClient.client
    .db()
    .collection('files')
    .find({ parentId, userId: ObjectId(userId) })
    .skip(skip)
    .limit(limit)
    .toArray();

  return res.status(200).json(files);
};

export const putPublishFile = async (req, res) => {
  const { userId } = req;
  const { id } = req.params;

  const result = await dbClient.client
    .db()
    .collection('files')
    .updateOne(
      { _id: ObjectId(id), userId: ObjectId(userId) },
      { $set: { isPublic: true } }
    );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(id) });

  return res.status(200).json(file);
};

export const putUnpublishFile = async (req, res) => {
  const { userId } = req;
  const { id } = req.params;

  const result = await dbClient.client
    .db()
    .collection('files')
    .updateOne(
      { _id: ObjectId(id), userId: ObjectId(userId) },
      { $set: { isPublic: false } }
    );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(id) });

  return res.status(200).json(file);
};

export const getFileData = async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { size } = req.query;

  const file = await dbClient.client
    .db()
    .collection('files')
    .findOne({ _id: ObjectId(id) });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file.isPublic && file.userId.toString() !== userId) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (file.type === 'folder') {
    return res.status(400).json({ error: "A folder doesn't have content" });
  }

  const thumbnailPath = `${file.localPath}_${size}`;

  if (!fs.existsSync(thumbnailPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const mimeType = mime.lookup(file.name);

  res.setHeader('Content-Type', mimeType);
  const fileStream = fs.createReadStream(thumbnailPath);
  fileStream.pipe(res);
};