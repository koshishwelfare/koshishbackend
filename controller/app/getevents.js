import { homeEventsModel } from "../../models/Events/eventsSchema.js";
import { buildListQuery } from "../utils/listQuery.js";

const eventProjection = {
   _id: 1,
   name: 1,
   startdate: 1,
   endDate: 1,
   isPrize: 1,
   isActive: 1,
   mode: 1,
   team: 1,
   thumbnail: 1,
   isCertification: 1,
   registrationOpen: 1,
   isTop: 1,
   desc: 1
};

const eventFilterFields = [
   "isTop",
   "isActive",
   "registrationOpen",
   "mode",
   "team",
   "isPrize",
   "isCertification"
];

const eventSortFields = ["startdate", "endDate", "name"];

const listEvents = async (req, res, { baseFilter = {}, message }) => {
   const queryData = buildListQuery({
      query: req.query,
      baseFilter,
      allowedFilterFields: eventFilterFields,
      searchFields: ["name", "desc"],
      defaultSortBy: "startdate",
      allowedSortFields: eventSortFields
   });

   const dataQuery = homeEventsModel.find(queryData.filter, eventProjection).sort(queryData.sort);

   let totalCount = null;
   if (queryData.pagination) {
      totalCount = await homeEventsModel.countDocuments(queryData.filter);
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

const getAllEvents = async(req,res) => {
 try {
    return await listEvents(req, res, {
         message: "get all homeEvent"
    });
 } catch (error) {
    console.log(error)
   return res.json ({success:false, message:error.message});
 }


}
const getNewEvents = async(req,res) => {
   try {
      return await listEvents(req, res, {
         baseFilter: { isActive: true },
         message: "get all New Event"
      });
   } catch (error) {
      // console.log(error)
      res.json ({success:false, message:error.message});
   }
  
  
  }
  const getpastEvents = async(req,res) => {
   try {
      return await listEvents(req, res, {
         baseFilter: { isActive: false },
         message: "get all Past Event"
      });
   } catch (error) {
      // console.log(error)
      res.json ({success:false, message:error.message});
   }
  }
  const getTopEvents = async(req,res) => {
   try {
      const topReq = {
        ...req,
        query: {
          ...req.query,
               page: req.query.page || "1",
          limit: req.query.limit || "4"
        }
      };
      return await listEvents(topReq, res, {
         baseFilter: { isTop: true },
         message: "get all Top Event"
      });
   } catch (error) {
      // console.log(error)
      res.json ({success:false, message:error.message});
   }
  }
  const getEventById = async(req,res) => {
   try {
      const {id} = req.body
      const data = await homeEventsModel.findById(id);
      // console.log(data);
      res.json({success:true, message:`found Event of id ${id}`, data:data})
   } catch (error) {
      // console.log(error)
      res.json ({success:false, message:error.message});
   }
  }

export  {getEventById,getAllEvents,getTopEvents,getNewEvents,getpastEvents}