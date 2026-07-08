import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    country: { type: String },
    taxId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Client', clientSchema);
