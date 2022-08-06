问题背景

@antv/g v5 升级到 v6 后，ER 图属性区文本位置异常。
根因是 v6 下不能依赖 Group 的 x/y 定位，导致子元素相对坐标未被正确平移。
改动内容

mark-positioner.ts (line 82)
重写 positionGroupContents 的位移策略：
计算 offsets；
递归处理子 group；
将位移下沉到子元素真实坐标（x/y、x1/y1/x2/y2、cx/cy、points、path 等）。
更新注释，明确 v6 语义：不要依赖 Group x/y，改为“materialize 到 children”。
render.spec.ts (line 56)
新增 ER 回归测试：
断言属性行路径已是正确绝对坐标（如 M -0.5,319.4 ...）；
断言不再依赖旧的 group transform（matrix(1,0,0,1,-0.500000,294.399994)）。
