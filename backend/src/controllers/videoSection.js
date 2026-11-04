const cloudinary = require('cloudinary').v2;
const mongoose = require("mongoose");
const Problem = require("../models/problem");
const SolutionVideo = require("../models/solutionVideo");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const generateUploadSignature = async (req, res) => {
  try {
    const { problemId } = req.params;
    if (!mongoose.isValidObjectId(problemId))
      return res.status(400).json({ error: 'Invalid problem ID' });

    const userId = req.result._id;
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = `CodeCrux-solutions/${problemId}/${userId}_${timestamp}`;

    const uploadParams = { timestamp, public_id: publicId };
    const signature = cloudinary.utils.api_sign_request(uploadParams, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    res.status(500).json({ error: 'Failed to generate upload credentials' });
  }
};

const saveVideoMetadata = async (req, res) => {
  try {
    const { problemId, cloudinaryPublicId, duration } = req.body;
    const userId = req.result._id;

    if (!problemId || !cloudinaryPublicId || !mongoose.isValidObjectId(problemId))
      return res.status(400).json({ error: 'problemId and cloudinaryPublicId are required' });

    // Verify the upload really exists on Cloudinary and take the URL from there, not from the client
    const cloudinaryResource = await cloudinary.api.resource(cloudinaryPublicId, { resource_type: 'video' });
    if (!cloudinaryResource) {
      return res.status(400).json({ error: 'Video not found on Cloudinary' });
    }

    const existingVideo = await SolutionVideo.findOne({ problemId, cloudinaryPublicId });
    if (existingVideo) {
      return res.status(409).json({ error: 'Video already exists' });
    }

    // Real thumbnail image URL (a frame of the video as jpg)
    const thumbnailUrl = cloudinary.url(cloudinaryResource.public_id, {
      resource_type: 'video',
      secure: true,
      format: 'jpg',
      transformation: [{ width: 400, height: 225, crop: 'fill' }, { start_offset: 'auto' }]
    });

    const videoSolution = await SolutionVideo.create({
      problemId,
      userId,
      cloudinaryPublicId,
      secureUrl: cloudinaryResource.secure_url,
      duration: cloudinaryResource.duration || duration,
      thumbnailUrl
    });

    res.status(201).json({
      message: 'Video solution saved successfully',
      videoSolution: {
        id: videoSolution._id,
        thumbnailUrl: videoSolution.thumbnailUrl,
        duration: videoSolution.duration,
        uploadedAt: videoSolution.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving video metadata:', error);
    res.status(500).json({ error: 'Failed to save video metadata' });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { problemId } = req.params;
    if (!mongoose.isValidObjectId(problemId))
      return res.status(400).json({ error: 'Invalid problem ID' });

    const video = await SolutionVideo.findOne({ problemId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Remove from Cloudinary first; only delete the DB record if that worked
    await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video', invalidate: true });
    await SolutionVideo.deleteOne({ _id: video._id });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

module.exports = { generateUploadSignature, saveVideoMetadata, deleteVideo };
