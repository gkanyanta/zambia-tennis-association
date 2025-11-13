import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentId: String,
  amount: Number
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Open', 'Junior', 'Madalas', 'Regional', 'Circuit'],
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'registration-open', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  registrations: [registrationSchema],
  maxParticipants: {
    type: Number,
    default: null
  },
  entryFee: {
    type: Number,
    default: 0
  },
  registrationDeadline: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

tournamentSchema.virtual('participants').get(function() {
  return this.registrations.filter(r => r.paymentStatus === 'paid').length;
});

export default mongoose.model('Tournament', tournamentSchema);
