const { v2: cloudinary } = require('cloudinary');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error('Missing Cloudinary config env vars: CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadImage({ buffer, filename, folder = 'uploads' }) {
  if (!buffer || !filename) {
    throw new Error('Invalid file data for Cloudinary upload');
  }

  const dataUri = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
  const publicId = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${filename.replace(/\.[^/.]+$/, '')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    overwrite: false,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    raw: result,
  };
}

module.exports = {
  uploadImage,
};
