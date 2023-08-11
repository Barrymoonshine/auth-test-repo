import 'dotenv/config';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const mongoDb = `mongodb+srv://${process.env.DB_CREDENTIALS}@cluster0.wym9xjg.mongodb.net/auth-test?retryWrites=true&w=majority`;
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

const User = mongoose.model(
  'User',
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  })
);

const app = express();
app.set('view engine', 'ejs');

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

app.get('/sign-up-form', (req, res) => res.render('sign-up-form'));

app.post('/sign-up-form', async (req, res, next) => {
  try {
    bcrypt.hash('somePassword', 10, async (err, hashedPassword) => {
      if (err) {
        console.log(err);
      }
      const user = new User({
        username: req.body.username,
        password: hashedPassword,
      });
      const result = await user.save();
      res.redirect('/');
    });
  } catch (err) {
    return next(err);
  }
});

app.post(
  '/log-in',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
  })
);

app.get('/log-out', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.listen(3000, () => console.log('app listening on port 3000!'));
