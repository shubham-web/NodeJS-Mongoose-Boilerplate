const {
	AccountStatuses: { UNVERIFIED },
} = require("./../config/constants");
const {
	Schema,
	model,
	SchemaTypes: { String, Array },
	Query,
} = require("mongoose");
const Common = require("../controllers/Common");

const userSchema = new Schema(
	{
		name: String,
		email: String,
		password: String,
		usercontent: { type: String },
		resetPasswordToken: String,
		privileges: Array,
		status: { type: String, default: UNVERIFIED },
	},
	{
		timestamps: true,
	}
);

const passwordHashing = function (next) {
	let passwordModified = false;
	if (this instanceof Query) {
		let newValues = this.getUpdate();
		passwordModified = "password" in newValues["$set"];
		if (passwordModified) {
			this.set({
				password: Common.hashPassword(newValues["$set"]["password"]),
			});
		}
	} else if (this.password && this.isModified("password")) {
		this.password = Common.hashPassword(this.password);
	}
	next();
};

userSchema.pre("save", passwordHashing);
userSchema.pre("update", passwordHashing);
userSchema.pre("updateOne", passwordHashing);
userSchema.pre("updateMany", passwordHashing);

let userModel = model("User", userSchema);
module.exports = userModel;
