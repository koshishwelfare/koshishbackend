import CocicularModel from "../../models/Cocirculer/cocerculerProfile.js";

const changeCocercular = async (cocircularData) => {
    console.log("cocircularData",cocircularData);
    await CocicularModel.updateMany({isactive:true},{isactive:false})
    return await CocicularModel.create(cocircularData);
}

changeCocercular.list = async ({
    search = '',
    isactive,
    sortBy = 'date',
    sortOrder = 'desc',
    page = 1,
    limit = 10
} = {}) => {
    const query = {};
    const trimmedSearch = String(search || '').trim();

    if (trimmedSearch) {
        const regex = new RegExp(trimmedSearch, 'i');
        query.$or = [
            { name: regex },
            { email: regex },
            { speciality: regex },
            { degree: regex }
        ];
    }

    if (typeof isactive === 'boolean') {
        query.isactive = isactive;
    }

    const allowedSortFields = new Set(['name', 'email', 'speciality', 'degree', 'isactive', 'date']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'date';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [records, total] = await Promise.all([
        CocicularModel.find(query, {
            name: 1,
            email: 1,
            speciality: 1,
            degree: 1,
            isactive: 1,
            date: 1
        })
            .sort({ [safeSortBy]: safeSortOrder })
            .skip(skip)
            .limit(safeLimit),
        CocicularModel.countDocuments(query)
    ]);

    return {
        records,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.max(Math.ceil(total / safeLimit), 1)
        }
    };
};

changeCocercular.activate = async (id) => {
    const user = await CocicularModel.findById(id);
    if (!user) {
        return null;
    }
    await CocicularModel.updateMany({ _id: { $ne: user._id }, isactive: true }, { isactive: false });
    user.isactive = true;
    await user.save();
    return user;
};

changeCocercular.deactivate = async (id) => {
    const user = await CocicularModel.findByIdAndUpdate(id, { isactive: false }, { new: true });
    return user;
};

export default changeCocercular