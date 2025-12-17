import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteVideoFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType, userId } = req.query;
    const skip=(Number(page)-1)*Number(limit);
    //TODO:make sure you make sortBy safer by using only fields which are possible using enum
    let sortingType=sortType=="asc"?1:-1;
    //TODO: get all videos based on query, sort, pagination
    const videos=await Video.aggregate([
        {
            $match:{isPublished:true}
        },
        {
            $sort:{
                [sortBy]:Number(sortingType)
            }
        },
        {
            $skip:skip
        },
        {
            $limit:Number(limit)
        }
    ])
    res.status(200).json(new ApiResponse(200,videos,"videos retrieved successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title || !description || !req.file){
        throw new ApiError(403,"user Credentials are required with video");
    }
    const cloudinaryVideo=await uploadOnCloudinary(req.file.path);
    const video=await Video.create({
        title,
        description,
        duration:String(cloudinaryVideo.duration),
        owner:req.user._id,
        videoFile:cloudinaryVideo.url
    })
    res.status(201).json(new ApiResponse(201,video,"video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video=await Video.findById(videoId);
    res.status(200).json(new ApiResponse(200,video,"video retrieved successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const localVideoPath=req.file.path;
    const pastVideo=Video.findById(videoId);
    const publicId = pastVideo.videoFile.split("/upload/")[1].split("/").slice(1).join("/").replace(/\.[^/.]+$/, "");

    if(!localVideoPath){
        throw new ApiError(402,"video file not recieved successfully")
    }
    const cloudinaryVideo=await uploadOnCloudinary(localVideoPath);
    //TODO: update video details like title, description, thumbnail
    const newVideo=await Video.findByIdAndUpdate(videoId,{
        videoFile:cloudinaryVideo.url
    },{new:true});
    deleteVideoFromCloudinary(publicId)
    res.status(200).json(new ApiResponse(200,newVideo,"video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video=await Video.findById(videoId);
    const publicId = video.videoFile.split("/upload/")[1].split("/").slice(1).join("/").replace(/\.[^/.]+$/, "");
    const deletedVideo=deleteVideoFromCloudinary(publicId);
    res.status(200).json(new ApiResponse(200,deletedVideo,"video delted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const videoPublishState=await Video.findByIdAndUpdate(
  videoId,
  [
    {
      $set: {
        isPublished: { $not: "$isPublished" }
      }
    }
  ],
  { new: true }
);
    res.status(200).json(new ApiResponse(200,videoPublishState,`video publish status toggled to ${videoPublishState.isPublished}`));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
