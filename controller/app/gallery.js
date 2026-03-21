import { GalleryModel } from "../../models/Gallary/gallerySchema.js";
import { buildListQuery } from "../utils/listQuery.js";

const galleryProjection = {
  _id: 1,
  galleryTitle: 1,
  galleryDescription: 1,
  date: 1,
  thumbnail: 1,
  isNews: 1,
  isActive: 1
};

const galleryFilterFields = ["isNews", "isActive"];
const gallerySortFields = ["date", "galleryTitle"];
const gallerySearchFields = ["galleryTitle", "galleryDescription"];

const listGallery = async (req, res, { baseFilter = {}, message }) => {
  const queryData = buildListQuery({
    query: req.query,
    baseFilter,
    allowedFilterFields: galleryFilterFields,
    searchFields: gallerySearchFields,
    defaultSortBy: "date",
    allowedSortFields: gallerySortFields
  });

  const dataQuery = GalleryModel.find(queryData.filter, galleryProjection).sort(queryData.sort);

  let totalCount = null;
  if (queryData.pagination) {
    totalCount = await GalleryModel.countDocuments(queryData.filter);
    dataQuery.skip(queryData.pagination.skip).limit(queryData.pagination.limit);
  }

  const data = await dataQuery;

  const response = {
    success: true,
    message,
    data
  };

  if (queryData.pagination) {
    response.pagination = {
      page: queryData.pagination.page,
      limit: queryData.pagination.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / queryData.pagination.limit)
    };
  }

  return res.json(response);
};

const getAllMemories = async (req, res) => {
  try {
    return await listGallery(req, res, {
      baseFilter: { isNews: false },
      message: "All memories found"
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getAllNews = async (req, res) => {
  try {
    return await listGallery(req, res, {
      baseFilter: { isNews: true },
      message: "All Newspaper found"
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await GalleryModel.findById(id);
    const {
      youtube,
      linkedin,
      googlePhoto,
      instagram,
      facebook,
      galleryDescription,
      date,
      Photo,
      galleryTitle
    } = data;
    const sendData = {
      youtube,
      linkedin,
      googlePhoto,
      instagram,
      facebook,
      galleryDescription,
      date,
      Photo,
      galleryTitle
    };
    res.json({ success: true, data: sendData, message: `gallery found ${id}` });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { getAllMemories, getAllNews, getGalleryById };