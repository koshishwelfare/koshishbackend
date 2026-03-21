import { Announcement } from "../../models/App/announcementSchema.js"
import { buildListQuery } from "../utils/listQuery.js";

const announcementProjection = {
    _id: 1,
    isAtive: 1,
    heading: 1,
    image: 1,
    date: 1,
    announcement: 1
};

const announcementSortFields = ["date", "heading"];

const listAnnouncements = async (req, res, { baseFilter = {}, message }) => {
    const queryData = buildListQuery({
        query: req.query,
        baseFilter,
        allowedFilterFields: ["isAtive"],
        searchFields: ["heading", "announcement"],
        defaultSortBy: "date",
        allowedSortFields: announcementSortFields
    });

    const dataQuery = Announcement.find(queryData.filter, announcementProjection).sort(queryData.sort);

    let totalCount = null;
    if (queryData.pagination) {
        totalCount = await Announcement.countDocuments(queryData.filter);
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

const getnewAnnouncement = async(req, res) => {
    try {
      return await listAnnouncements(req, res, {
        baseFilter: { isAtive: true },
        message: "find new data"
      });
    } catch (error) {
        // console.log(error);
        return res.json({success: false, message: error.message})
    }
}
const getAllAnnouncement = async(req, res) => {
    try {
            return await listAnnouncements(req, res, {
                message: "find all data"
            });
    } catch (error) {
        console.log(error);
        return res.json({success: false, message: error.message})
    }
}
const getpastAnnouncement = async(req, res) => {
    try {
            return await listAnnouncements(req, res, {
                baseFilter: { isAtive: false },
                message: "find past data"
            });
    } catch (error) {
        console.log(error);
        return res.json({success: false, message: error.message})
    }
}
const getmyAnnouncement = async(req, res)=>{
    try {
        const {id} = req.body
        
        const data = await Announcement.findById(id);
        return res.json({success: true, message: "find my data", data})
    } catch (error) {
            console.log(error)
        return res.json({success: true, message: `find ${id}`})
    }
}
export {getAllAnnouncement, getnewAnnouncement,getpastAnnouncement,getmyAnnouncement}
