const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const taskSchema = new Schema({
    title:{type:String,required:true},
    content:{type:String,required:true},
    tags:{type:[String],default:[]},
    isPinned:{type:Boolean,default:false},
// userId: { type: String, required: true },
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

createdOn: { type: Date, default: () => new Date() 

}
});
module.exports = mongoose.model("Task",taskSchema);