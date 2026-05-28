const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  auth: { type: Boolean, default: false },
  supporter: { type: Boolean, default: false },
  withdrawal: { type: Boolean, default: false },
  dashboard: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hanya boleh ada 1 dokumen
maintenanceSchema.pre('save', async function(next) {
  const Maintenance = this.constructor;
  if (this.isNew) {
    const count = await Maintenance.countDocuments();
    if (count >= 1) {
      throw new Error('Hanya boleh ada satu pengaturan maintenance');
    }
  }
  next();
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);