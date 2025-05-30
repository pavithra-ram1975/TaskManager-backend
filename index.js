require("dotenv").config();
const cors = require("cors");
const express = require("express");
const config = require("./config.json");
const mongoose = require("mongoose");
mongoose.connect(config.connectionString);
const User = require("./models/user.model");
const Task = require("./models/task.model");


const app = express();
const jwt = require("jsonwebtoken");
const{authenticateToken} = require("./utilities");
app.use(express.json());

// app.use(
//     cors({
//         origin:"*",

//     })
// );
// app.use(cors({
//   origin: "https://taskmanager-frontend-pied.vercel.app", 
//   credentials: true
// }));

const allowedOrigins = [
  "https://taskmanager-frontend-pied.vercel.app",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
//   credentials: true
}));


// app.use(cors({
//   origin: function (origin, callback) {
//     console.log("Origin attempting to access:", origin);
//     callback(null, true); // Allow all origins
//   },
//   credentials: true // Keep this true only if using cookies
// }));


app.get("/", (req, res) => {
  res.send("Task Manager API is up and running!");
});

app.post("/createacc",async(req,res)=>{
    const{fullName,email,password} = req.body;
    if(!fullName){
        return res
        .status(400)
        .json({error:true,message:"Full name is required"});

    }
    if(!email){
        return res.status(400).json({error:true,message:"Email required"});
    }
    if(!password){
        return res.status(400)
        .json({error:true,message:"Password is required"});
    }
    const isUser = await User.findOne({email:email});
    if(isUser){
        return res.json({
            error:true,
            message:"User already exist",

        })
    }
    const user = new User({
        fullName,
        email,
        password
    });
    await user.save();
    const accessToken = jwt.sign({
        _id: user._id,
        email:user.email,
        fullName:user.fullName
    }
        ,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"3600m",
    });
    return res.json({
        error:false,
        user,
        accessToken,
        message:"Registeration Successful",
    });
});
app.post("/login",async(req,res)=>{
    const{email,password} = req.body;
    if(!email){
        return res.status(400).json({message:"Email is required"});
    }
if(!password){
    return res.status(400).json({message:"Password is required"});
}
const userInfo = await User.findOne({email:email});
if(!userInfo){
    return res.status(400).json({message:"User not found"});
}
if(userInfo.email == email && userInfo.password==password){
    const user = {user:userInfo};
    const accessToken = jwt.sign({
        _id:userInfo._id,
        email:userInfo.email,
        fullName:userInfo.fullName
    }
        ,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"36000m",
    });
    return res.json({
        error:false,
        message:"Login Successfull",
        email,
        accessToken,
    });

}
else{
    return res.status(400).json({
        error:true,
        message:"Invalid Credentials",
    });
}

});

app.get("/getuser",authenticateToken,async(req,res)=>{
    const user = req.user
    const isUser = await User.findOne({_id:user._id});
    if(!isUser){
        return res.sendStatus(401)
    }
    return res.json({
        user:{
            fullName:isUser.fullName,
            email:isUser.email,
            _id:isUser._id,
            createdOn:isUser.createdOn,
        },
        message:"",
    });
})
app.post("/addtask",authenticateToken,async(req,res)=>{
    const{title,content,tags} = req.body;
    const user  = req.user;
    if(!title){
        return res.status(400).json({error:true,message:"Title is required"});
    }
    if(!content){
        return res
        .status(400)
        .json({error:true,message:"Content is required"});
    }

    try{
        const note = new Task({
            title,
            content,
            tags:tags|| [],
            userId:user._id,
        });
        await note.save();
        return res.json({
            error:false,
            note,
            message:"Task added Successfully",
        });
    }
catch(error){
    // console.error("Error in /addtask:", error);
    console.error("Error in /addtask:", error.message, error.stack);

    return res.status(500).json({
        error:true,
        message:"Internal Server Error",
    });

}
});

app.put("/edittask/:noteId",authenticateToken,async(req,res)=>{
    const noteId = req.params.noteId;
    const{ title,content,tags,isPinned} = req.body;
    const user = req.user;
    if(!title && !content && !tags){
        return res
        .status(400)
        .json({error:true,message:"No changes provided"});
    }
    try{
        const note = await Task.findOne({_id:noteId,userId:user._id});
        if(!note){
            return res
            .status(404)
            .json({error:true,message:"Task not found"});
        }
        if(title) note.title = title;
        if(content) note.content = content;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;
        await note.save();
        return res.json({
            error:false,
            note,
            message:"Task updated"
        });

    }
    catch(error){
        return res.status(500)
        .json({
            error:true,
            message:"Internal Server Error",
        })
    }

});

app.get("/getalltask",authenticateToken,async(req,res)=>{
    const user  = req.user;
    try{
        const tasks = await Task.find({userId:user._id}).sort({isPinned:-1});
        return res.json({
            error:false,
            tasks,
            message:"All notes retrieved successfully",
        });

    }
    catch(error){
        return res.status(500).json({
            error:true,
            message:"Internal Server Error",
        })
    }
});

app.delete("/deletetask/:noteId",authenticateToken ,async(req,res)=>{
    const noteId = req.params.noteId;
    const user = req.user;
    try{
        const task = await Task.findOne({_id:noteId,userId:user._id});
        if(!task){
            return res
            .status (404)
            .json({error:true,message:"Note not found"});

        }
        await Task.deleteOne({_id:noteId,userId:user._id});
        return res.json({
            error:false,
            message:"Note deleted successfully",
        });

    }
    catch(error){
        return res.status(500)
        .json({
            error:true,
            message:"Internal Server Error",
        });
    }

});
app.put("/updatepinned/:noteId",authenticateToken,async(req,res)=>{
    const noteId = req.params.noteId;
    const{ isPinned} = req.body;
    const user = req.user;
    try{
        const note = await Task.findOne({_id:noteId,userId:user._id});
        if(!note){
            return res
            .status(404)
            .json({error:true,message:"Task not found"});
        }
        note.isPinned = isPinned ;
        await note.save();
        return res.json({
            error:false,
            note,
            message:"Task pinned"
        });

    }
    catch(error){
        return res.status(500)
        .json({
            error:true,
            message:"Internal Server Error",
        })
    }


});

// Search Notes

// app.get("/searchtask", authenticateToken, async (req, res) => {
//   const user  = req.user;
//   const { query } = req.query;

//   if (!query) {
//     return res.status(400).json({ error: true, message: "Search query is required" });
//   }

//   try {
//     const matchingNotes = await Task.find({
//       userId: user._id,
//       $or: [
//         { title: { $regex: new RegExp(query, "i") } },
//         { content: { $regex: new RegExp(query, "i") } },
//       ],
//     });

//     return res.json({
//       error: false,
//       notes: matchingNotes,
//       message: "Notes matching the search query retrieved successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       error: true,
//       message: "Failed to search notes. Please try again.",
//     });
//   }
// });

app.get("/searchtask", authenticateToken, async (req, res) => {
  const user = req.user;
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: true, message: "Search query is required" });
  }

  try {
    const matchingNotes = await Task.find({
      userId: user._id,
      $or: [
        { title: { $regex: new RegExp(query, "i") } },
        { content: { $regex: new RegExp(query, "i") } },
      ],
    });

    return res.json({
      error: false,
      notes: matchingNotes,
      message: "Notes matching the search query retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Failed to search notes. Please try again.",
    });
  }
});



// app.listen(8000);
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Load .env variables

module.exports = app;
