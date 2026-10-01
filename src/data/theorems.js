import Derivative from '../visualizations/Derivative.jsx'
import RiemannSum from '../visualizations/RiemannSum.jsx'
import Taylor from '../visualizations/Taylor.jsx'
import Fourier from '../visualizations/Fourier.jsx'
import EpsilonDelta from '../visualizations/EpsilonDelta.jsx'
import EulerFormula from '../visualizations/EulerFormula.jsx'
import DoubleIntegral from '../visualizations/DoubleIntegral.jsx'
import ImportantLimits from '../visualizations/ImportantLimits.jsx'
import MeanValue from '../visualizations/MeanValue.jsx'
import Antiderivative from '../visualizations/Antiderivative.jsx'
import FTC from '../visualizations/FTC.jsx'
import IntegralApps from '../visualizations/IntegralApps.jsx'
import ODE from '../visualizations/ODE.jsx'
import SpaceGeom from '../visualizations/SpaceGeom.jsx'
import PartialDeriv from '../visualizations/PartialDeriv.jsx'
import Gradient from '../visualizations/Gradient.jsx'
import TripleIntegral from '../visualizations/TripleIntegral.jsx'
import Green from '../visualizations/Green.jsx'
import SurfaceIntegral from '../visualizations/SurfaceIntegral.jsx'
import SeriesTests from '../visualizations/SeriesTests.jsx'
import PowerSeries from '../visualizations/PowerSeries.jsx'

const raw = String.raw

// 目录结构参照同济大学《高等数学》（第七/八版）章节顺序
// coming: true = 待制作的占位卡片
export const chapters = [
  // ─────────────── 上册 ───────────────
  {
    id: 'ch1',
    part: '上册 · 一元函数微积分',
    title: '第一章 · 函数与极限',
    theorems: [
      {
        id: 'epsilon-delta',
        name: '极限的 ε-δ 定义',
        short: raw`\lim_{x \to a} f(x) = A`,
        formula: raw`\lim_{x \to a} f(x) = A \;\Longleftrightarrow\; \forall\, \varepsilon > 0,\ \exists\, \delta > 0,\ \text{当 } 0 < |x - a| < \delta \text{ 时，恒有 } |f(x) - A| < \varepsilon`,
        intuition:
          '无论你要求多小的误差 ε，我总能圈出一个足够窄的范围 δ，让函数值全部落在误差带里——极限是一种"想多近就能多近"的承诺。',
        note: '拖动蓝点选择极限点 a，再把 ε 拖小：观察绿色 δ 竖带如何被迫收缩，才能保证曲线完全穿过橙色 ε 横带。还有「挑战模式」可以自己给出 δ 让系统判定。',
        viz: EpsilonDelta,
        dim: '2d',
      },
      {
        id: 'important-limits',
        name: '两个重要极限',
        short: raw`\lim_{x\to 0}\frac{\sin x}{x}=1,\qquad \lim_{x\to\infty}\left(1+\frac{1}{x}\right)^x=e`,
        formula: raw`\lim_{x\to 0}\frac{\sin x}{x}=1,\qquad \lim_{x\to\infty}\left(1+\frac{1}{x}\right)^x=e`,
        intuition:
          '第一个用单位圆里三角形/扇形/三角形的面积夹逼；第二个是自然常数 e 的定义。它们是整个极限计算体系的基石。',
        note: '可切换两种极限：sin x/x 模式下拖橙色点让 x→0，观察上下界 cos x 和 1 把它夹向 1；(1+1/x)^x 模式下把 x 拖到 1000，看曲线逼近水平渐近线 e≈2.71828。',
        viz: ImportantLimits,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch2',
    part: '上册 · 一元函数微积分',
    title: '第二章 · 导数与微分',
    theorems: [
      {
        id: 'derivative',
        name: '导数的定义',
        short: raw`f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}`,
        formula: raw`f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}`,
        intuition:
          '把两点连线（割线）的一端沿曲线无限推向另一端，割线就变成了切线——导数就是曲线在该点的"瞬时方向"。',
        note: '拖动蓝色切点改变位置，再把 h 拖小：观察橙色虚线（割线）如何逼近真实切线，割线斜率如何一步步逼近 f′(a)。可切换 sin/cos 预设，或在代码里直接改函数。',
        viz: Derivative,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch3',
    part: '上册 · 一元函数微积分',
    title: '第三章 · 微分中值定理与导数的应用',
    theorems: [
      {
        id: 'mean-value',
        name: '微分中值定理（罗尔/拉格朗日）',
        short: raw`f(b)-f(a) = f'(\xi)(b-a)`,
        formula: raw`f(b)-f(a) = f'(\xi)(b-a),\qquad a<\xi<b`,
        intuition:
          '一条光滑曲线两端高度差，总能在中间找到一点 ξ，那里的切线斜率恰好等于两端连线的斜率——割线与切线平行。罗尔定理是 f(a)=f(b) 的特例（切线水平）。',
        note: '拖动蓝/红端点改变区间 [a,b]，绿色 ξ 点会自动标出使 f\'(ξ)=割线斜率的位置；切换"罗尔"模式会把端点拉到同高，此时切线水平。可换抛物线/三次/正弦函数，三次函数会出现两个 ξ。',
        viz: MeanValue,
        dim: '2d',
      },
      {
        id: 'taylor',
        name: '泰勒公式（麦克劳林级数）',
        short: raw`f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n`,
        formula: raw`f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n`,
        intuition:
          '在 x = 0 附近，用一个只含加减乘的多项式去"模仿"原函数：阶数越高，模仿得越像。ln(1+x) 还能让你亲眼看到"模仿失败"的收敛半径。',
        note: '橙色是泰勒多项式，蓝色是原函数，绿色圆点是展开点——拖动它，多项式会以新位置为锚重新贴合原函数。切换到 ln(1+x) 并提高阶数，注意 |x − a| ≥ 1 之外多项式彻底跑飞——那就是收敛半径。',
        viz: Taylor,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch4',
    part: '上册 · 一元函数微积分',
    title: '第四章 · 不定积分',
    theorems: [
      {
        id: 'antiderivative',
        name: '原函数与不定积分、换元积分法',
        short: raw`\int f(x)\,dx = F(x) + C`,
        formula: raw`\int f(x)\,dx = F(x) + C,\qquad \int f(g(x))g'(x)\,dx = \int f(u)\,du`,
        intuition:
          '求导的逆运算：找到一族只差常数的函数，其导函数恰好等于 f(x)。换元积分法的本质是坐标变换下面积不变。',
        note: '两种模式：原函数族——拖动 C 看 F(x)+C 上下平移，导数始终等于 f(x)；换元积分——左侧 ∫2x·cos(x²)dx 与右侧 ∫cos(u)du（u=x²）的面积始终相等，直观展示"凑微分"的几何意义。',
        viz: Antiderivative,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch5',
    part: '上册 · 一元函数微积分',
    title: '第五章 · 定积分',
    theorems: [
      {
        id: 'riemann',
        name: '黎曼和与定积分',
        short: raw`\int_a^b f(x)\,dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(\xi_i)\,\Delta x_i`,
        formula: raw`\int_a^b f(x)\,dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(\xi_i)\,\Delta x_i`,
        intuition:
          '曲边图形不好算，就用一排细长矩形去逼近；矩形越切越细，面积之和就无限逼近曲边梯形的真实面积。',
        note: 'n 是矩形个数，试试切换取样点（左/中/右），观察同样 n 下哪种逼近误差最小。把 n 拖大，误差趋于 0——这就是"取极限"的实际含义。',
        viz: RiemannSum,
        dim: '2d',
      },
      {
        id: 'ftc',
        name: '牛顿–莱布尼茨公式（微积分基本定理）',
        short: raw`\int_a^b f(x)\,dx = F(b) - F(a)`,
        formula: raw`\int_a^b f(x)\,dx = F(b) - F(a),\qquad \frac{d}{dx}\int_a^x f(t)\,dt = f(x)`,
        intuition:
          '面积问题与切线问题互为逆运算：积分不必再硬算无穷和，找到原函数就能求值。面积函数 A(x)=∫ₐˣf 的导数恰好是 f(x) 本身。',
        note: '拖动橙点 x 改变上限，紫色阴影面积 A(x)=∫ₐˣf 随之变化。读数里 A\'(x)（数值微分）与 f(x) 几乎完全相等，直观证明了"积分是导数的逆"——这就是微积分基本定理。',
        viz: FTC,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch6',
    part: '上册 · 一元函数微积分',
    title: '第六章 · 定积分的应用',
    theorems: [
      {
        id: 'integral-apps',
        name: '面积、体积、弧长与物理应用',
        short: raw`V=\int_a^b A(x)\,dx,\qquad s=\int_a^b\sqrt{1+f'(x)^2}\,dx`,
        formula: raw`V=\pi\int_a^b f(x)^2\,dx,\qquad s=\int_a^b\sqrt{1+f'(x)^2}\,dx`,
        intuition:
          '旋转体体积、平面曲线弧长都可以统一成"切薄片再求和"：圆盘法把旋转体切成垂直于轴的薄圆盘，弧长公式来自每一小段的勾股定理 ds=√(dx²+dy²)。',
        note: '两种模式：旋转体体积——左图二维截面、右图三维旋转体（可拖拽旋转），拖动 slice 看圆盘位置，体积=π∫f(x)²dx；弧长——用 n 段折线逼近曲线，n 越大折线长度越逼近精确弧长 ∫√(1+f\'²)dx。',
        viz: IntegralApps,
        dim: '2d3d',
      },
    ],
  },
  {
    id: 'ch7',
    part: '上册 · 一元函数微积分',
    title: '第七章 · 微分方程',
    theorems: [
      {
        id: 'ode',
        name: '一阶线性微分方程与可降阶方程',
        short: raw`y' + P(x)y = Q(x)`,
        formula: raw`y' + P(x)y = Q(x),\qquad y = e^{-\int P\,dx}\left(\int Q\,e^{\int P\,dx}\,dx + C\right)`,
        intuition:
          '把"变化率的规律"翻译成方程，再用积分还原出函数本身。斜率场（方向场）把每一点的 y\' 画成小线段，解曲线处处与这些线段相切。',
        note: '三种方程可选：指数衰减 y\'=-2y、线性 y\'=x-y、逻辑斯谛 y\'=y(1-y)。背景小线段是斜率场，蓝色是穿过初始点的解曲线（RK4 数值积分）。拖动橙色初始点，解曲线会重新穿过新的初值；对比读数中数值解与解析解的误差。',
        viz: ODE,
        dim: '2d',
      },
    ],
  },

  // ─────────────── 下册 ───────────────
  {
    id: 'ch8',
    part: '下册 · 多元函数微积分',
    title: '第八章 · 向量代数与空间解析几何',
    theorems: [
      {
        id: 'space-geom',
        name: '空间曲面、曲线与常见二次曲面',
        short: raw`F(x,y,z)=0`,
        formula: raw`\frac{x^2}{a^2}+\frac{y^2}{b^2}+\frac{z^2}{c^2}=1,\quad z=\frac{x^2}{a^2}-\frac{y^2}{b^2},\quad \ldots`,
        intuition:
          '球面、椭球、抛物面、马鞍面、双曲面、锥面——六种二次曲面是多元微积分的"舞台"，理解它们的形状是学好多元积分的基础。',
        note: '六种二次曲面可切换：球面、椭球面、椭圆抛物面、双曲抛物面（马鞍）、单叶双曲面、锥面。拖动 a/b/c 参数改变形状，按住鼠标旋转观察。马鞍面在原点是鞍点，单叶双曲面是直纹面。',
        viz: SpaceGeom,
        dim: '3d',
      },
    ],
  },
  {
    id: 'ch9',
    part: '下册 · 多元函数微积分',
    title: '第九章 · 多元函数微分法及其应用',
    theorems: [
      {
        id: 'partial-deriv',
        name: '偏导数、全微分与切平面',
        short: raw`dz = \frac{\partial z}{\partial x}dx + \frac{\partial z}{\partial y}dy`,
        formula: raw`dz = \frac{\partial z}{\partial x}dx + \frac{\partial z}{\partial y}dy`,
        intuition:
          '站在曲面上，沿 x、y 两个方向各有一条切线，它们撑起的平面就是曲面的局部替身——切平面。两条切线的斜率就是两个偏导数。',
        note: '调节切点 (x₀,y₀)：绿色切线沿 x 方向，斜率=fx=∂z/∂x；紫色切线沿 y 方向，斜率=fy=∂z/∂y；它们张成的橙色平面就是切平面 z=z₀+fx(x−x₀)+fy(y−y₀)。读数给出全微分 dz=fx·dx+fy·dy。',
        viz: PartialDeriv,
        dim: '3d',
      },
      {
        id: 'gradient',
        name: '方向导数与梯度',
        short: raw`\nabla f = (f_x,\ f_y,\ f_z)`,
        formula: raw`\nabla f = (f_x,\ f_y),\qquad D_{\mathbf u}f = \nabla f\cdot \mathbf u`,
        intuition:
          '梯度是上升最快的方向：长度是最陡坡度，方向垂直于等高线。任意方向的方向导数 = 梯度在该方向的投影。',
        note: '灰色等高线 + 绿色梯度向量场。橙色箭头是当前点的梯度（⊥等高线、指向上坡）；蓝色是你选定的方向 u，读数显示方向导数 D_u f = ∇f·u。把方向角转到与梯度同向，D_u f 达到最大值 |∇f|。',
        viz: Gradient,
        dim: '2d',
      },
    ],
  },
  {
    id: 'ch10',
    part: '下册 · 多元函数微积分',
    title: '第十章 · 重积分',
    theorems: [
      {
        id: 'double-integral',
        name: '二重积分（曲顶柱体的体积）',
        short: raw`\iint_D f(x,y)\,d\sigma = \lim_{\lambda\to 0}\sum_{i=1}^{n} f(\xi_i,\eta_i)\,\Delta\sigma_i`,
        formula: raw`\iint_D f(x,y)\,d\sigma = \lim_{\lambda\to 0}\sum_{i=1}^{n} f(\xi_i,\eta_i)\,\Delta\sigma_i`,
        intuition:
          '一元定积分把曲边梯形切成一排细矩形；二重积分把曲面下方的曲顶柱体切成 n×n 根细柱体。网格越切越密，柱体体积之和就越逼近真实体积——三维场景可以转着看。',
        note: '按住拖动可任意旋转视角、滚轮缩放。调节 n 看 n×n 柱体阵列如何填满曲面下方；切换取样点（左下/中心/右上）；也可以在 MATLAB 代码里修改二元函数 f(x,y)，如 sin(x).*cos(y) + 1.5。点击曲面或任意柱体有数值注释。',
        viz: DoubleIntegral,
        dim: '3d',
      },
      {
        id: 'triple-integral',
        name: '三重积分',
        short: raw`\iiint_\Omega f(x,y,z)\,dV`,
        formula: raw`\iiint_\Omega f(x,y,z)\,dV = \lim_{\lambda\to 0}\sum_{i=1}^{n} f(\xi_i,\eta_i,\zeta_i)\,\Delta V_i`,
        intuition:
          '把空间区域 Ω 切成小立方体，每个体积 ΔV，乘以密度 f 后求和——和二重积分类似，只是从"面积"推广到"体积"。',
        note: '区域 Ω = [−1,1]×[−1,1]×[0,2] 被切成 n³ 个小立方体（颜色越红 f 值越大）。Σf·ΔV 逼近三重积分。f=1 时结果就是体积 8；f=x²+y²+z² 参考值=16。可旋转观察立方体阵列。',
        viz: TripleIntegral,
        dim: '3d',
      },
    ],
  },
  {
    id: 'ch11',
    part: '下册 · 多元函数微积分',
    title: '第十一章 · 曲线积分与曲面积分',
    theorems: [
      {
        id: 'line-integral',
        name: '曲线积分与格林公式',
        short: raw`\oint_L P\,dx+Q\,dy = \iint_D\!\left(\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}\right)d\sigma`,
        formula: raw`\oint_L P\,dx+Q\,dy = \iint_D\!\left(\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}\right)d\sigma`,
        intuition:
          '沿闭合边界走一圈的累积量，等于边界内部场的"旋涡总量"——格林公式把线积分转化为区域上的二重积分。',
        note: '灰色箭头是向量场 F=(P,Q)，橙色圆周是闭合曲线 L，紫色圆盘是区域 D。读数对比：线积分 ∮Pdx+Qdy 与 二重积分 ∬(∂Q/∂x−∂P/∂y)dA，两者相等。F=(−y/2,x/2) 的旋度=1，线积分恰好等于面积。',
        viz: Green,
        dim: '2d',
      },
      {
        id: 'surface-integral',
        name: '曲面积分、高斯公式与斯托克斯公式',
        short: raw`\oiint_{\partial\Omega}\mathbf{F}\cdot d\mathbf{S} = \iiint_\Omega \nabla\!\cdot\mathbf{F}\,dV`,
        formula: raw`\oiint_{\partial\Omega}\mathbf{F}\cdot d\mathbf{S} = \iiint_\Omega \nabla\!\cdot\mathbf{F}\,dV`,
        intuition:
          '穿过闭合曲面的总通量，等于内部源头的总产出——高斯公式（散度定理）是格林公式的三维推广。',
        note: '蓝色球面是闭合曲面 ∂Ω，绿/红箭头是场向量 F（绿=F·n＞0 流出，红=流入）。读数：散度 ∇·F × 球体积 = 总通量。F=(x,y,z) 散度=3（处处冒水）；F=(−y,x,0) 散度=0（纯旋转无汇源，净流量=0）。',
        viz: SurfaceIntegral,
        dim: '3d',
      },
    ],
  },
  {
    id: 'ch12',
    part: '下册 · 多元函数微积分',
    title: '第十二章 · 无穷级数',
    theorems: [
      {
        id: 'series-tests',
        name: '常数项级数及其审敛法',
        short: raw`\sum_{n=1}^{\infty} u_n = \lim_{n\to\infty} S_n`,
        formula: raw`\sum_{n=1}^{\infty} u_n = \lim_{n\to\infty} S_n`,
        intuition:
          '级数收敛 ⇔ 部分和数列 Sₙ 有极限。比较、比值、根值审敛法回答"有没有极限"这个问题。',
        note: '蓝色折线是部分和数列 Sₙ，橙色虚线是极限（若收敛）。四种级数：Σ1/n²→π²/6、Σ1/n 发散、Σ1/n!→e−1、交错调和→ln2。读数给出比值法 lim|uₙ₊₁/uₙ| 和根值法 lim|uₙ|^(1/n) 的估计：＜1 收敛、＞1 发散、=1 失效。',
        viz: SeriesTests,
        dim: '2d',
      },
      {
        id: 'power-series',
        name: '幂级数与收敛半径',
        short: raw`\sum_{n=0}^{\infty} a_n x^n,\quad R = \frac{1}{\limsup \sqrt[n]{|a_n|}}`,
        formula: raw`\sum_{n=0}^{\infty} a_n x^n,\quad R = \frac{1}{\limsup \sqrt[n]{|a_n|}}`,
        intuition:
          '多项式的无限延长版，但只在一个有限区间内可靠——收敛半径划出了"模仿有效"的边界，区间外多项式会跑飞。',
        note: '蓝色是原函数 f(x)，橙色是 N 阶部分和 S_N(x)。绿色虚线标出收敛半径 ±R。在 |x|＜R 内 S_N 随 N 增大逼近 f；在 |x|＞R 外 S_N 迅速发散。四个例子：几何级数(R=1)、eˣ(R=∞)、cos x(R=∞)、−ln(1−x)(R=1)。',
        viz: PowerSeries,
        dim: '2d',
      },
      {
        id: 'euler-formula',
        name: '欧拉公式（复指数）',
        short: raw`e^{i\theta} = \cos\theta + i\sin\theta`,
        formula: raw`e^{i\theta} = \cos\theta + i\sin\theta`,
        intuition:
          'e^iθ 不是抽象符号：它是一个在单位圆上旋转的动点，cos θ 和 sin θ 分别是它在实轴、虚轴上的投影。三维视角下它是一条螺旋：俯视是圆，侧影是波。',
        note: '乘以 e^iθ 相当于把复平面上的点旋转 θ 角。观察圆上动点如何"生长"出余弦波（实部）与正弦波（虚部）；切到三维视图，可以看到圆和波其实是同一条螺旋线的两个投影。',
        viz: EulerFormula,
        dim: '2d3d',
      },
      {
        id: 'fourier',
        name: '傅里叶级数（周期波形分解）',
        short: raw`f(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty} (a_n \cos nx + b_n \sin nx)`,
        formula: raw`f(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty} (a_n \cos nx + b_n \sin nx)`,
        intuition:
          '任何周期振动都能拆成一群简单正弦波的叠加。方波、三角波、锯齿波、窄脉冲、整流正弦——每种波形的"谐波配方"不同：波形越光滑，谐波衰减越快、需要的项越少。',
        note: '圆盘链每一级代表一次谐波（半径=振幅，转速=频率倍数）。二维看"圆链画出波形"，三维看本质：每级谐波是一条螺旋，合成螺旋俯视是旋转轨迹、侧视墙上就是波形。谐波数 n 越大越贴近目标；方波、锯齿波在跳变点附近始终残留约 9% 的吉布斯尖峰。交互区可切换 5 种波形，代码里可改 n 与 wave。',
        viz: Fourier,
        dim: '2d3d',
      },
    ],
  },
]

export function findTheorem(id) {
  for (const ch of chapters) {
    const t = ch.theorems.find((t) => t.id === id && !t.coming)
    if (t) return t
  }
  return null
}
