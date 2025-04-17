import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
dotenv.config();

const { Schema } = mongoose;

mongoose.connect(process.env.DB_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

console.log('DB_URL:', process.env.DB_URL);

const userSchema = new Schema({
  username: String
});
const User = mongoose.model('User', userSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('_id username');
    if (!users) {
      res.send('No users found');
    }
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    console.log(user);
    await user.save();
    res.json({
      username: user.username,
      _id: user._id
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    if (!user) {
      res.send('User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    const exercise = new Exercise({
      user_id
        : _id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    console.error('Error creating exercise:', err);
    res.send('Error creating exercise');
    res.status(500).json({ error: 'Internal server error' });
  }
}
);
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // Ensure only one response is sent
    }

    let dateObject = {};
    if (from) {
      dateObject["$gte"] = new Date(from);
    }
    if (to) {
      dateObject["$lte"] = new Date(to);
    }

    let filter = { user_id: _id };
    if (from || to) {
      filter.date = dateObject;
    }

    const exercises = await Exercise.find(filter).limit(+limit || 500);
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
