#version 440

#ifndef CRT_RGB_SHIFT
#define CRT_RGB_SHIFT 1
#endif
#ifndef CRT_BLOOM
#define CRT_BLOOM 1
#endif
#ifndef CRT_FRAME_SHININESS
#define CRT_FRAME_SHININESS 1
#endif
#ifndef CRT_CURVATURE
#define CRT_CURVATURE 1
#endif

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform ubuf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float screenCurvature;
    float rgbShift;
    float frameShininess;
    float frameSize;
    float screen_brightness;
    float bloom;
    float classicCrt;
    vec4 fontColor;
    vec4 backgroundColor;
    float chromaColor;
    vec2 virtualResolution;
    int rasterization;
};

layout(binding = 1) uniform sampler2D source;
layout(binding = 2) uniform sampler2D bloomSource;

float min2(vec2 v) { return min(v.x, v.y); }
float max2(vec2 v) { return max(v.x, v.y); }
float rand2(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 distortCoordinates(vec2 coords){
    vec2 paddedCoords = coords * (vec2(1.0) + frameSize * 2.0) - frameSize;
    vec2 cc = (paddedCoords - vec2(0.5));
    float dist = dot(cc, cc) * screenCurvature;
    return (paddedCoords + cc * (1.0 + dist) * dist);
}

void main() {
    vec2 cc = vec2(0.5) - qt_TexCoord0;

    float shownDraw = 1.0;
    float isReflection = 0.0;
    float isScreen = 1.0;

    vec2 txt_coords = qt_TexCoord0;
#if CRT_CURVATURE == 1
    vec2 curvatureCoords = distortCoordinates(qt_TexCoord0);
    shownDraw = max2(step(vec2(0.0), curvatureCoords) - step(vec2(1.0), curvatureCoords));
    isScreen = min2(step(vec2(0.0), curvatureCoords) - step(vec2(1.0), curvatureCoords));
    isReflection = shownDraw - isScreen;
    txt_coords = curvatureCoords * (-1.0 + 2.0 * step(vec2(0.0), curvatureCoords) - 2.0 * step(vec2(1.0), curvatureCoords));
    if (classicCrt > 0.5) {
        // The 1.1.1 glass reflects at twice the source coordinate outside the tube.
        txt_coords = curvatureCoords * (-2.0 + 3.0 * step(vec2(0.0), curvatureCoords)
                                               - 3.0 * step(vec2(1.0), curvatureCoords));
    }
#endif

    vec3 txt_color = texture(source, txt_coords).rgb;

#if CRT_RGB_SHIFT == 1
    vec2 displacement = vec2(rgbShift, 0.0);
    vec3 rightColor = texture(source, txt_coords + displacement).rgb;
    vec3 leftColor = texture(source, txt_coords - displacement).rgb;
    txt_color.r = leftColor.r * 0.10 + rightColor.r * 0.30 + txt_color.r * 0.60;
    txt_color.g = leftColor.g * 0.20 + rightColor.g * 0.20 + txt_color.g * 0.60;
    txt_color.b = leftColor.b * 0.30 + rightColor.b * 0.10 + txt_color.b * 0.60;
#endif

    vec3 finalColor = txt_color * shownDraw;

    vec3 bloomColor = txt_color;
    float bloomAlpha = 0.0;
#if CRT_BLOOM == 1 || CRT_FRAME_SHININESS == 1
    vec4 bloomFullColor = texture(bloomSource, txt_coords);
    bloomColor = bloomFullColor.rgb;
    bloomAlpha = bloomFullColor.a;
#endif

    if (classicCrt > 0.5) {
        // 1.1.1 masks the text at the source pixels before adding bloom and noise.
        if (rasterization == 1 || rasterization == 2) {
            vec2 cell = fract(txt_coords * virtualResolution);
            vec2 stripe = smoothstep(0.0, 0.5, cell) - smoothstep(0.5, 1.0, cell);
            txt_color *= mix(0.5, 1.0, stripe.y);
            if (rasterization == 2)
                txt_color *= mix(0.5, 1.0, stripe.x);
        }
        // 1.1.1 adds tinted bloom after the phosphor colour mapping.
        txt_color += vec3(0.0001);
        float grey = dot(txt_color, vec3(0.21, 0.72, 0.04));
        vec3 foreground = mix(fontColor.rgb, txt_color * fontColor.rgb / grey, chromaColor);
        finalColor = mix(backgroundColor.rgb, foreground, grey * shownDraw);
#if CRT_BLOOM == 1
        float greyBloom = dot(bloomColor, vec3(0.21, 0.72, 0.04));
        vec3 tintedBloom = fontColor.rgb * mix(vec3(greyBloom), bloomColor, chromaColor);
        finalColor += clamp(tintedBloom * bloom * bloomAlpha, 0.0, 0.5);
#endif
        fragColor = vec4(finalColor * screen_brightness, qt_Opacity);
        return;
    }

#if CRT_BLOOM == 1
    vec3 bloomOnScreen = bloomColor * isScreen;
    finalColor += clamp(bloomOnScreen * bloom * bloomAlpha, 0.0, 0.5);
    float bloomScale = 1.0 + max(bloom, 0.0);
    finalColor /= bloomScale;
#endif

#if CRT_FRAME_SHININESS == 1
    vec3 reflectionColor = mix(bloomColor * bloomAlpha * 2.0, finalColor, frameShininess * 0.5);
    finalColor = mix(finalColor, reflectionColor, isReflection);
#endif

    finalColor *= screen_brightness;

    float noise = rand2(qt_TexCoord0) - 0.5;
    finalColor = clamp(finalColor + vec3(noise * 0.025), 0.0, 1.0);

    fragColor = vec4(finalColor, qt_Opacity);
}
