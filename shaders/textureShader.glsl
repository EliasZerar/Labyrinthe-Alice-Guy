precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
void main(void) {
    vec4 color = texture2D(uMainSampler, outTexCoord);
    // Apply some color manipulation for better textures
    color.rgb = pow(color.rgb, vec3(1.2));
    gl_FragColor = color;
}
