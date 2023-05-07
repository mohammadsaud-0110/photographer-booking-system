const express = require("express");
const { UserModel } = require("../models/user.model");
const {Image}= require("../models/image.model") 
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const tokenList={};
const session = require("express-session")
const { authMiddleWare } = require("../middlewares/jwt.middleware");
require("dotenv").config()
const userRoute = express.Router();
const checkRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  }
}
userRoute.get("/", async(req,res)=>{
  try {
    const data = await UserModel.find();
    res.send(data)
    
  } catch (error) {
    res.status(403).json({error:error.message})
  }
})
const multer = require('multer');
const ejs = require('ejs');

//Set up multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
userRoute.post("/register", async (req, res) => {
  const { name, email, pass, role } = req.body;
  const check = await UserModel.find({ email });
  if (check.length > 0) {
    return res.status(200).json({ "ok": false, "msg": "User already exist" });
  }
  bcrypt.hash(pass, 5, async (err, hash) => {
    try {
      const data = new UserModel({ name, email, pass: hash, role });
      await data.save();
      res.status(200).json({ "ok": true, "msg": "Registered Successfully" });

    } catch (error) {
      res.status(400).json({ "ok": false, "msg": error.message });
    }

  });
})

userRoute.post("/login", async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User with this email not found" })
    }
    const isPasswordSame = await bcrypt.compare(pass, user.pass)
    if (!isPasswordSame) {
      return res.status(401).json({ message: "Invalid email or password" })
    }
    const token = jwt.sign({ userId: user._id }, process.env.secret, { expiresIn: '1hr' })
    const refreshToken = jwt.sign({ userId: user._id }, process.env.refresh_secret, { expiresIn: "3hr" })
    const response = {
      "ok": true,
      "token": token,
      "refreshToken": refreshToken
    }
    tokenList[refreshToken] = response
    res.status(200).json(response)
  } catch (error) {
    res.status(400).json({"ok":false,"msg":error.message});
  }
})
userRoute.post('/apply', authMiddleWare, async (req, res) => {
  const { name, email, camera, expertise, address, samplePics } = req.body;
  try {
    let user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    user.name = name;
    user.email = email;
    user.camera = camera;
    user.expertise = expertise;
    user.address = address;
    user.samplePics = samplePics;
    user.approved = false;
    user.role = 'photographer';
    await user.save();
    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

userRoute.get('/pending', authMiddleWare, async (req, res) => {
  try {
    const users = await UserModel.find({ role: "photographer", approved: false });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
userRoute.put('/applications/:email',authMiddleWare,checkRole("admin"),async (req, res) => {
  try {
    const { email } = req.params;
    const { approved } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).send({ error: 'User not found' });
    } else if (user.role !== 'photographer') {
      res.status(400).send({ error: 'User is not a photographer' });
    } else {
      user.approved = approved;
      await user.save();
      res.send({ message: 'Photographer application updated successfully' });
    }
  } catch (err) {
    res.status(500).send({ error: 'Server Error' });
  }
});
userRoute.get("/logout",async(req,res)=>{
  try {
    
  } catch (error) {
    
  }
})
userRoute.use(session({
  secret: 'dancingCar',
  resave: false,
  saveUninitialized: false
}));
userRoute.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: err.message });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

=======

//Route for updating the details
userRoute.patch('/submit_photographer_details',authMiddleWare,async(req,res)=>{
  console.log("hi");
  console.log(req.user._id)
  const payload=req.body
  console.log(req.body)
  try{
    await UserModel.findByIdAndUpdate({"_id":req.user._id},payload)
    res.send({message:"success"});
  }catch(err){
    console.log(err);
  }
})

//Route for uploading the images
userRoute.post('/upload', upload.single('image'),authMiddleWare,async (req, res) => {
  const image = new Image({
    name: req.file.originalname,
    image: {
      data: req.file.buffer,
      contentType: req.file.mimetype,
      userID:req.user._id // adding userid in the image
    },
  });

  await image.save();
  res.send({message:"image uploaded"});
});

//Route for getting the images by userID

userRoute.get('/images', async (req, res) => {
  const photographers= await UserModel.find({approved:true})
  const images = await Image.aggregate([
      {
        $group: {
          _id: '$image.userID',
          images: {
            $push: {
              _id: '$image.data',
              content_type:'$image.contentType'
            },
          },
        },
      },
    ]);
    
    res.send({images,photographers});
});
module.exports = {
  userRoute,checkRole
}