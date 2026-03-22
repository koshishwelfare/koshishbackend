import CocicularModel from '../../models/Cocirculer/cocerculerProfile.js';
import validator from 'validator';
import bcrypt from 'bcrypt';
import { cloudinaryUploadImage } from '../../middleware/cloudimage/cloudinary.js';

const listCocircularForConsole = async (req, res) => {
  try {
    const {
      q = '',
      isactive,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};
    const trimmedQ = String(q || '').trim();

    if (trimmedQ) {
      const regex = new RegExp(trimmedQ, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { speciality: regex }];
    }

    if (isactive === 'true') filter.isactive = true;
    if (isactive === 'false') filter.isactive = false;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const allowedSortFields = new Set(['date', 'name', 'email', 'isactive']);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'date';
    const safeSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      CocicularModel.find({}, { password: 0 })
        .find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip(skip)
        .limit(safeLimit),
      CocicularModel.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1)
      },
      message: 'Co-curricular listing found'
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const getCocircularForConsoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CocicularModel.findById(id, { password: 0 });

    if (!data) {
      return res.json({ success: false, message: 'Co-curricular profile not found' });
    }

    return res.json({ success: true, data, message: 'Co-curricular profile found' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const createCocircularForConsole = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality = 'General',
      degree = 'B.tech',
      linkedin = '',
      quote = '',
      about = '',
      isactive = true
    } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: 'name, email and password are required' });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!trimmedName) {
      return res.json({ success: false, message: 'name is required' });
    }

    if (!validator.isEmail(normalizedEmail)) {
      return res.json({ success: false, message: 'Please provide a valid email address' });
    }

    if (String(password).length < 8) {
      return res.json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existing = await CocicularModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.json({ success: false, message: 'Co-curricular user already exists with this email' });
    }

    let image = '';
    if (req.file) {
      const imageUpload = await cloudinaryUploadImage(req.file);
      image = imageUpload?.secure_url || '';
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const created = await CocicularModel.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      image,
      speciality: String(speciality || '').trim() || 'General',
      degree: String(degree || '').trim() || 'B.tech',
      linkedin: String(linkedin || '').trim(),
      quote: String(quote || '').trim(),
      about: String(about || '').trim() || 'Created from co-curricular console',
      isactive: String(isactive) === 'false' ? false : Boolean(isactive)
    });

    return res.json({ success: true, data: created, message: 'Co-curricular profile created successfully' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const updateCocircularForConsole = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    const editableFields = ['name', 'email', 'speciality', 'degree', 'linkedin', 'quote', 'about', 'isactive'];
    editableFields.forEach((field) => {
      if (req.body[field] === undefined) {
        return;
      }

      if (field === 'isactive') {
        updates.isactive = String(req.body.isactive) === 'true';
        return;
      }

      updates[field] = typeof req.body[field] === 'string'
        ? req.body[field].trim()
        : req.body[field];
    });

    if (req.body.password !== undefined && String(req.body.password).trim()) {
      if (String(req.body.password).length < 8) {
        return res.json({ success: false, message: 'Password must be at least 8 characters' });
      }
      updates.password = await bcrypt.hash(String(req.body.password), 10);
    }

    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.json({ success: false, message: 'name cannot be empty' });
    }

    if (updates.email !== undefined) {
      const normalizedEmail = String(updates.email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return res.json({ success: false, message: 'email cannot be empty' });
      }
      if (!validator.isEmail(normalizedEmail)) {
        return res.json({ success: false, message: 'Please provide a valid email address' });
      }
      const existingByEmail = await CocicularModel.findOne({
        email: normalizedEmail,
        _id: { $ne: id }
      });
      if (existingByEmail) {
        return res.json({ success: false, message: 'Another co-curricular user already uses this email' });
      }
      updates.email = normalizedEmail;
    }

    if (req.file) {
      const imageUpload = await cloudinaryUploadImage(req.file);
      if (imageUpload?.secure_url) {
        updates.image = imageUpload.secure_url;
      }
    }

    if (!Object.keys(updates).length) {
      return res.json({ success: false, message: 'No fields provided to update' });
    }

    const updated = await CocicularModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.json({ success: false, message: 'Co-curricular profile not found' });
    }

    return res.json({ success: true, data: updated, message: 'Co-curricular profile updated successfully' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const deleteCocircularForConsole = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req?.cocircular?.userId || '') === String(id)) {
      return res.json({ success: false, message: 'You cannot delete your own active account' });
    }

    const deleted = await CocicularModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.json({ success: false, message: 'Co-curricular profile not found' });
    }

    return res.json({ success: true, message: 'Co-curricular profile deleted successfully' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export {
  listCocircularForConsole,
  getCocircularForConsoleById,
  createCocircularForConsole,
  updateCocircularForConsole,
  deleteCocircularForConsole
};
