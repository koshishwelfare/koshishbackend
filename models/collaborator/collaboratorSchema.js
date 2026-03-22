import mongoose from "mongoose";

const CollaboratorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    image: {
      type: String,
      default: ""
    },
    website: {
      type: String,
      default: ""
    },
    speciality: {
      type: String,
      default: "Organization Partner"
    },
    about: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const CollaboratorModel = mongoose.models.Collaborator || mongoose.model("Collaborator", CollaboratorSchema);

export default CollaboratorModel;
