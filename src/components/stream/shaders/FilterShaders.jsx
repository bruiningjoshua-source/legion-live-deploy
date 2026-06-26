// Legion Live WebGL Filter Shaders — GPU-accelerated, no external dependencies.

export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying   vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord  = a_texCoord;
  }
`;

const F = body => `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec2      u_resolution;
  varying vec2      v_texCoord;
  ${body}
`;

export const FRAGMENT_SHADERS = {
  none:         F(`void main(){ gl_FragColor = texture2D(u_image, v_texCoord); }`),
  beauty_soft:  F(`
    void main(){
      vec2 px=1.0/u_resolution; vec4 c=texture2D(u_image,v_texCoord); vec4 b=vec4(0.0);
      b+=texture2D(u_image,v_texCoord+vec2(-1,-1)*px)*0.0625;
      b+=texture2D(u_image,v_texCoord+vec2( 0,-1)*px)*0.1250;
      b+=texture2D(u_image,v_texCoord+vec2( 1,-1)*px)*0.0625;
      b+=texture2D(u_image,v_texCoord+vec2(-1, 0)*px)*0.1250;
      b+=texture2D(u_image,v_texCoord+vec2( 0, 0)*px)*0.2500;
      b+=texture2D(u_image,v_texCoord+vec2( 1, 0)*px)*0.1250;
      b+=texture2D(u_image,v_texCoord+vec2(-1, 1)*px)*0.0625;
      b+=texture2D(u_image,v_texCoord+vec2( 0, 1)*px)*0.1250;
      b+=texture2D(u_image,v_texCoord+vec2( 1, 1)*px)*0.0625;
      float lum=dot(c.rgb,vec3(0.299,0.587,0.114));
      float skin=smoothstep(0.3,0.75,lum)*(1.0-smoothstep(0.0,0.3,abs(c.r-c.g-0.1)));
      gl_FragColor=vec4(mix(c.rgb,b.rgb*1.05,skin*0.55),1.0);
    }
  `),
  cinematic:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord); vec3 g=c.rgb*0.90+vec3(0.03,0.02,0.05);
      float l=dot(g,vec3(0.299,0.587,0.114)); vec3 d=mix(g,vec3(l),0.15);
      gl_FragColor=vec4(pow(clamp(d,0.0,1.0),vec3(1.08)),1.0);
    }
  `),
  golden_hour:  F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord); vec3 w=c.rgb+vec3(0.06,0.02,-0.04);
      gl_FragColor=vec4(clamp(w*vec3(1.05,1.0,0.92),0.0,1.0),1.0);
    }
  `),
  neon_dream:   F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec3 n=clamp(vec3(c.r*1.1,c.g*0.82,c.b*1.35)*1.15,0.0,1.0);
      float v=1.0-length(v_texCoord-0.5)*0.75;
      gl_FragColor=vec4(n*v,1.0);
    }
  `),
  synthwave:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec3 s=clamp(vec3(c.r*1.2,c.g*0.62,c.b*1.4),0.0,1.0);
      float scan=sin(v_texCoord.y*800.0)*0.025;
      gl_FragColor=vec4(s-scan,1.0);
    }
  `),
  bw_crisp:     F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      float g=dot(c.rgb,vec3(0.299,0.587,0.114));
      g=clamp((g-0.5)*1.25+0.5,0.0,1.0);
      gl_FragColor=vec4(vec3(g),1.0);
    }
  `),
  warm_vintage: F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec3 sp=vec3(dot(c.rgb,vec3(0.393,0.769,0.189)),dot(c.rgb,vec3(0.349,0.686,0.168)),dot(c.rgb,vec3(0.272,0.534,0.131)));
      vec3 v=mix(c.rgb,sp,0.4)+vec3(0.05,0.02,0.0);
      float vg=1.0-pow(length(v_texCoord-0.5)*1.15,2.0);
      gl_FragColor=vec4(clamp(v*vg,0.0,1.0),1.0);
    }
  `),
  vivid_pop:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      float l=dot(c.rgb,vec3(0.299,0.587,0.114));
      vec3 p=clamp(mix(vec3(l),c.rgb,1.6)*1.04,0.0,1.0);
      gl_FragColor=vec4(p,1.0);
    }
  `),
  teal_orange:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      float l=dot(c.rgb,vec3(0.299,0.587,0.114));
      float skin=step(0.35,c.r)*step(0.0,c.r-c.b-0.05)*step(c.b,c.r);
      vec3 warm=c.rgb*vec3(1.12,0.98,0.82)+vec3(0.07,0.0,0.0);
      vec3 cool=c.rgb*vec3(0.85,1.02,1.18)+vec3(0.0,0.02,0.06);
      gl_FragColor=vec4(mix(cool,warm,skin),1.0);
    }
  `),
  noir_grade:     F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      float g=dot(c.rgb,vec3(0.21,0.72,0.07));
      g=(g-0.5)*1.3+0.5; g=clamp(g,0.0,1.0);
      vec2 d=v_texCoord-0.5; float vig=1.0-dot(d,d)*1.6;
      gl_FragColor=vec4(vec3(g,g,g+0.05)*max(0.0,vig),1.0);
    }
  `),
  film_bleach:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      float l=dot(c.rgb,vec3(0.299,0.587,0.114));
      vec3 b=mix(c.rgb,vec3(l*1.1,l*1.05,l*0.95),0.5);
      gl_FragColor=vec4(clamp(b*0.92+0.04,0.0,1.0),1.0);
    }
  `),
  moonlight_grade:F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec3 cool=vec3(c.r*0.88,c.g*0.92,c.b*1.12)+vec3(0.02,0.03,0.08);
      float l=dot(cool,vec3(0.299,0.587,0.114));
      gl_FragColor=vec4(mix(cool,vec3(l),0.2)*0.88,1.0);
    }
  `),
  kodak_400:      F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec2 px=1.0/u_resolution;
      float grain=fract(sin(dot(v_texCoord*u_resolution,vec2(12.9898,78.233)))*43758.5453)*0.06-0.03;
      vec3 g=c.rgb*vec3(1.08,1.03,0.88)+vec3(0.05,0.02,0.0)+grain;
      gl_FragColor=vec4(clamp(g,0.0,1.0),1.0);
    }
  `),
  cyberpunk_2:    F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      vec3 o=c.rgb*vec3(1.15,0.7,1.35)+vec3(0.04,0.0,0.08);
      float scan=mod(floor(v_texCoord.y*u_resolution.y),4.0)<2.0?1.0:0.92;
      gl_FragColor=vec4(clamp(o*scan,0.0,1.0),1.0);
    }
  `),
  fuji_pro:       F(`
    void main(){
      vec4 c=texture2D(u_image,v_texCoord);
      gl_FragColor=vec4(clamp(c.rgb*vec3(0.97,1.06,1.02)+vec3(0.03,0.04,0.07),0.0,1.0),1.0);
    }
  `),
  summer_haze:    F(`
    void main(){
      vec2 px=1.0/u_resolution; vec4 c=texture2D(u_image,v_texCoord);
      vec4 b=vec4(0.0);
      b+=texture2D(u_image,v_texCoord+vec2(-1,0)*px*1.5)*0.25;
      b+=texture2D(u_image,v_texCoord)*0.5;
      b+=texture2D(u_image,v_texCoord+vec2(1,0)*px*1.5)*0.25;
      vec3 h=mix(c.rgb,b.rgb,0.15)*vec3(1.06,1.04,0.88)+vec3(0.08,0.05,0.0);
      gl_FragColor=vec4(clamp(h,0.0,1.0),1.0);
    }
  `),

};

export function createWebGLPipeline(canvas) {
  const gl = canvas.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance',antialias:false});
  if (!gl) return null;

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.error('[AR] Shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function makeProgram(fragSrc) {
    const vert = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog,vert); gl.attachShader(prog,frag); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog,gl.LINK_STATUS)){ console.error('[AR] Link:', gl.getProgramInfoLog(prog)); return null; }
    return prog;
  }
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,posBuf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const texBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,texBuf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,1,1,0,0,0,0,1,1,1,0]),gl.STATIC_DRAW);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const programs = {};
  const getProgram = id => { if(!programs[id]){const src=FRAGMENT_SHADERS[id]??FRAGMENT_SHADERS.none;programs[id]=makeProgram(src);}return programs[id]; };
  return {
    render(video, filterId, W, H) {
      if (!video||video.readyState<2) return;
      gl.viewport(0,0,W,H); gl.clear(gl.COLOR_BUFFER_BIT);
      const prog = getProgram(filterId||'none'); if(!prog) return;
      gl.useProgram(prog);
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
      const posLoc=gl.getAttribLocation(prog,'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER,posBuf); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
      const texLoc=gl.getAttribLocation(prog,'a_texCoord');
      gl.bindBuffer(gl.ARRAY_BUFFER,texBuf); gl.enableVertexAttribArray(texLoc); gl.vertexAttribPointer(texLoc,2,gl.FLOAT,false,0,0);
      const imgLoc=gl.getUniformLocation(prog,'u_image'); gl.uniform1i(imgLoc,0);
      const resLoc=gl.getUniformLocation(prog,'u_resolution'); if(resLoc) gl.uniform2f(resLoc,W,H);
      gl.drawArrays(gl.TRIANGLES,0,6);
    },
    destroy() {
      Object.values(programs).forEach(p=>p&&gl.deleteProgram(p));
      gl.deleteTexture(tex); gl.deleteBuffer(posBuf); gl.deleteBuffer(texBuf);
    },
  };
}