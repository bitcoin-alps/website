import Autoprefixer from "autoprefixer";
import postcssEasingGradients from "postcss-easing-gradients";
import postcssEasings from "postcss-easings";

export default {
	plugins: [
		postcssEasings,
		postcssEasingGradients({
			colorMode: "lch"
		}),
		Autoprefixer()
	]
};
