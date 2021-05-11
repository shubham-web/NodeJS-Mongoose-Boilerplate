const {
	VideoLayout: { WIDE },
} = require("./../config/constants");
const {
	Schema,
	SchemaTypes: { ObjectId, String, Boolean, Number },
	model,
} = require("mongoose");

const videoSchema = new Schema(
	{
		title: String,
		layout: { type: String, default: WIDE },
		thumb: String,
		preview: String,
		smallpreview: String,
		duration: { type: Number, default: 0, min: 0 },
		layerData: String,
		shared: { type: Boolean, default: false },
		creator: {
			type: ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

module.exports = model("Video", videoSchema);
