
import MemberModel from "../../models/member/MemberSchema.js";
import { buildListQuery } from "../utils/listQuery.js";

const memberProjection = {
  _id: 1,
  name: 1,
  linkedin: 1,
  image: 1,
  yog: 1,
  speciality: 1,
  quote: 1,
  joinTime: 1
};

const memberListFilterFields = [
  "isActive",
  "isVisionary",
  "isTop",
  "isCertify",
  "type",
  "role",
  "yog"
];

const memberSearchFields = ["name", "speciality", "quote", "aboutHead", "subject"];
const memberSortFields = ["joinTime", "name", "yog"];

const listMembers = async (req, res, { baseFilter = {}, projection = memberProjection, message }) => {
  const queryData = buildListQuery({
    query: req.query,
    baseFilter,
    allowedFilterFields: memberListFilterFields,
    searchFields: memberSearchFields,
    defaultSortBy: "joinTime",
    allowedSortFields: memberSortFields
  });

  const dataQuery = MemberModel.find(queryData.filter, projection).sort(queryData.sort);

  let totalCount = null;
  if (queryData.pagination) {
    totalCount = await MemberModel.countDocuments(queryData.filter);
    dataQuery.skip(queryData.pagination.skip).limit(queryData.pagination.limit);
  }

  const data = await dataQuery;

  const response = {
    success: true,
    data,
    message
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

const memberList =async (req,res) => {
  try {
    return await listMembers(req, res, {
      baseFilter: {},
      projection: memberProjection,
      message: "Member list found"
    });

  } catch (error) {
     console.log(error)
     res.json({success:false , message: error.message});
  }
}

export { memberList }