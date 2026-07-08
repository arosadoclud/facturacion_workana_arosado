import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    items: { type: [itemSchema], default: [] },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pendiente', 'pagada', 'anulada'], default: 'pendiente' },
    notes: { type: String },
  },
  { timestamps: true }
);

invoiceSchema.virtual('total').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
});

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

export default mongoose.model('Invoice', invoiceSchema);
