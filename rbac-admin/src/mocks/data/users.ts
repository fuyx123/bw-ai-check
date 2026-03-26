import type { UserInfo } from '../../types/rbac';

/**
 * 用户数据说明：
 * - 教职工（staff）：校长、教务人员、各学院专业主任/专高主任
 * - 学生（student）：分布在各学院不同阶段的班级中
 */
export const users: UserInfo[] = [

  // ======================================================
  // 教职工 — 校长
  // ======================================================
  {
    id: 'user-president',
    name: '王建国',
    email: 'wang.jianguo@bwvtc.edu',
    initials: 'WJ',
    departmentId: 'dept-root',
    departmentName: '巴威职业技术学院',
    roleIds: ['role-president'],
    roleName: '校长',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E001',
  },

  // ======================================================
  // 教职工 — 教务部门
  // ======================================================
  {
    id: 'user-affairs-01',
    name: '李晓梅',
    email: 'li.xiaomei@bwvtc.edu',
    initials: 'LX',
    departmentId: 'dept-affairs',
    departmentName: '教务部门',
    roleIds: ['role-academic-affairs'],
    roleName: '教务',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E002',
  },
  {
    id: 'user-affairs-02',
    name: '张海波',
    email: 'zhang.haibo@bwvtc.edu',
    initials: 'ZH',
    departmentId: 'dept-affairs',
    departmentName: '教务部门',
    roleIds: ['role-academic-affairs'],
    roleName: '教务',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E003',
  },

  // ======================================================
  // 教职工 — 全栈开发学院
  // ======================================================
  {
    id: 'user-fs-pro',
    name: '张专主',
    email: 'zhang.zhuanzhu@bwvtc.edu',
    initials: 'ZZ',
    departmentId: 'dept-fs-pro',
    departmentName: '全栈开发学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E101',
  },
  {
    id: 'user-fs-adv',
    name: '陈专高',
    email: 'chen.zhuangao@bwvtc.edu',
    initials: 'CZ',
    departmentId: 'dept-fs-adv',
    departmentName: '全栈开发学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E102',
  },

  // ======================================================
  // 教职工 — 云计算学院
  // ======================================================
  {
    id: 'user-cc-pro',
    name: '刘专主',
    email: 'liu.zhuanzhu@bwvtc.edu',
    initials: 'LZ',
    departmentId: 'dept-cc-pro',
    departmentName: '云计算学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E201',
  },
  {
    id: 'user-cc-adv',
    name: '赵专高',
    email: 'zhao.zhuangao@bwvtc.edu',
    initials: 'ZZ',
    departmentId: 'dept-cc-adv',
    departmentName: '云计算学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E202',
  },

  // ======================================================
  // 教职工 — 传媒学院
  // ======================================================
  {
    id: 'user-mc-pro',
    name: '孙专主',
    email: 'sun.zhuanzhu@bwvtc.edu',
    initials: 'SZ',
    departmentId: 'dept-mc-pro',
    departmentName: '传媒学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E301',
  },
  {
    id: 'user-mc-adv',
    name: '周专高',
    email: 'zhou.zhuangao@bwvtc.edu',
    initials: 'ZZ',
    departmentId: 'dept-mc-adv',
    departmentName: '传媒学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E302',
  },

  // ======================================================
  // 教职工 — 游戏学院
  // ======================================================
  {
    id: 'user-gd-pro',
    name: '吴专主',
    email: 'wu.zhuanzhu@bwvtc.edu',
    initials: 'WZ',
    departmentId: 'dept-gd-pro',
    departmentName: '游戏学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E401',
  },
  {
    id: 'user-gd-adv',
    name: '郑专高',
    email: 'zheng.zhuangao@bwvtc.edu',
    initials: 'ZZ',
    departmentId: 'dept-gd-adv',
    departmentName: '游戏学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E402',
  },

  // ======================================================
  // 教职工 — 鸿蒙学院
  // ======================================================
  {
    id: 'user-hm-pro',
    name: '冯专主',
    email: 'feng.zhuanzhu@bwvtc.edu',
    initials: 'FZ',
    departmentId: 'dept-hm-pro',
    departmentName: '鸿蒙学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E501',
  },
  {
    id: 'user-hm-adv',
    name: '韩专高',
    email: 'han.zhuangao@bwvtc.edu',
    initials: 'HZ',
    departmentId: 'dept-hm-adv',
    departmentName: '鸿蒙学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E502',
  },

  // ======================================================
  // 教职工 — 大数据学院
  // ======================================================
  {
    id: 'user-bd-pro',
    name: '秦专主',
    email: 'qin.zhuanzhu@bwvtc.edu',
    initials: 'QZ',
    departmentId: 'dept-bd-pro',
    departmentName: '大数据学院 · 专业阶段',
    roleIds: ['role-pro-director'],
    roleName: '专业主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E601',
  },
  {
    id: 'user-bd-adv',
    name: '许专高',
    email: 'xu.zhuangao@bwvtc.edu',
    initials: 'XZ',
    departmentId: 'dept-bd-adv',
    departmentName: '大数据学院 · 专业高级阶段',
    roleIds: ['role-adv-director'],
    roleName: '专高主任',
    accessStatus: 'full',
    userType: 'staff',
    loginId: 'E602',
  },

  // ======================================================
  // 讲师 — 每个班级配一名讲师（示例各学院各取 2 个班）
  // ======================================================

  // 全栈开发学院
  { id: 'tch-fs-pro-1', name: '王老师', email: 'wang.t@bwvtc.edu', initials: 'WT', departmentId: 'dept-fs-pro-1', departmentName: '全栈开发学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10101' },
  { id: 'tch-fs-pro-2', name: '刘老师', email: 'liu.t@bwvtc.edu', initials: 'LT', departmentId: 'dept-fs-pro-2', departmentName: '全栈开发学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10102' },
  { id: 'tch-fs-pro-3', name: '陈老师', email: 'chen.t1@bwvtc.edu', initials: 'CT', departmentId: 'dept-fs-pro-3', departmentName: '全栈开发学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10103' },
  { id: 'tch-fs-pro-4', name: '赵老师', email: 'zhao.t1@bwvtc.edu', initials: 'ZT', departmentId: 'dept-fs-pro-4', departmentName: '全栈开发学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10104' },
  { id: 'tch-fs-pro-5', name: '孙老师', email: 'sun.t1@bwvtc.edu', initials: 'ST', departmentId: 'dept-fs-pro-5', departmentName: '全栈开发学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10105' },
  { id: 'tch-fs-adv-1', name: '周老师', email: 'zhou.t1@bwvtc.edu', initials: 'ZT', departmentId: 'dept-fs-adv-1', departmentName: '全栈开发学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10601' },
  { id: 'tch-fs-adv-2', name: '吴老师', email: 'wu.t1@bwvtc.edu', initials: 'WT', departmentId: 'dept-fs-adv-2', departmentName: '全栈开发学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10602' },
  { id: 'tch-fs-adv-3', name: '郑老师', email: 'zheng.t1@bwvtc.edu', initials: 'ZT', departmentId: 'dept-fs-adv-3', departmentName: '全栈开发学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10603' },
  { id: 'tch-fs-adv-4', name: '冯老师', email: 'feng.t1@bwvtc.edu', initials: 'FT', departmentId: 'dept-fs-adv-4', departmentName: '全栈开发学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10604' },
  { id: 'tch-fs-adv-5', name: '韩老师', email: 'han.t1@bwvtc.edu', initials: 'HT', departmentId: 'dept-fs-adv-5', departmentName: '全栈开发学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10605' },
  { id: 'tch-fs-adv-6', name: '杨老师', email: 'yang.t1@bwvtc.edu', initials: 'YT', departmentId: 'dept-fs-adv-6', departmentName: '全栈开发学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T10606' },

  // 云计算学院
  { id: 'tch-cc-pro-1', name: '林老师', email: 'lin.t1@bwvtc.edu', initials: 'LT', departmentId: 'dept-cc-pro-1', departmentName: '云计算学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20101' },
  { id: 'tch-cc-pro-2', name: '徐老师', email: 'xu.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-cc-pro-2', departmentName: '云计算学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20102' },
  { id: 'tch-cc-pro-3', name: '何老师', email: 'he.t1@bwvtc.edu', initials: 'HT', departmentId: 'dept-cc-pro-3', departmentName: '云计算学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20103' },
  { id: 'tch-cc-pro-4', name: '高老师', email: 'gao.t1@bwvtc.edu', initials: 'GT', departmentId: 'dept-cc-pro-4', departmentName: '云计算学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20104' },
  { id: 'tch-cc-pro-5', name: '罗老师', email: 'luo.t1@bwvtc.edu', initials: 'LT', departmentId: 'dept-cc-pro-5', departmentName: '云计算学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20105' },
  { id: 'tch-cc-adv-1', name: '梁老师', email: 'liang.t1@bwvtc.edu', initials: 'LT', departmentId: 'dept-cc-adv-1', departmentName: '云计算学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20601' },
  { id: 'tch-cc-adv-2', name: '宋老师', email: 'song.t1@bwvtc.edu', initials: 'ST', departmentId: 'dept-cc-adv-2', departmentName: '云计算学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20602' },
  { id: 'tch-cc-adv-3', name: '谢老师', email: 'xie.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-cc-adv-3', departmentName: '云计算学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20603' },
  { id: 'tch-cc-adv-4', name: '唐老师', email: 'tang.t1@bwvtc.edu', initials: 'TT', departmentId: 'dept-cc-adv-4', departmentName: '云计算学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20604' },
  { id: 'tch-cc-adv-5', name: '邓老师', email: 'deng.t1@bwvtc.edu', initials: 'DT', departmentId: 'dept-cc-adv-5', departmentName: '云计算学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20605' },
  { id: 'tch-cc-adv-6', name: '方老师', email: 'fang.t1@bwvtc.edu', initials: 'FT', departmentId: 'dept-cc-adv-6', departmentName: '云计算学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T20606' },

  // 传媒学院
  { id: 'tch-mc-pro-1', name: '蔡老师', email: 'cai.t1@bwvtc.edu', initials: 'CT', departmentId: 'dept-mc-pro-1', departmentName: '传媒学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30101' },
  { id: 'tch-mc-pro-2', name: '潘老师', email: 'pan.t1@bwvtc.edu', initials: 'PT', departmentId: 'dept-mc-pro-2', departmentName: '传媒学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30102' },
  { id: 'tch-mc-pro-3', name: '曹老师', email: 'cao.t1@bwvtc.edu', initials: 'CT', departmentId: 'dept-mc-pro-3', departmentName: '传媒学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30103' },
  { id: 'tch-mc-pro-4', name: '袁老师', email: 'yuan.t1@bwvtc.edu', initials: 'YT', departmentId: 'dept-mc-pro-4', departmentName: '传媒学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30104' },
  { id: 'tch-mc-pro-5', name: '夏老师', email: 'xia.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-mc-pro-5', departmentName: '传媒学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30105' },
  { id: 'tch-mc-adv-1', name: '余老师', email: 'yu.t1@bwvtc.edu', initials: 'YT', departmentId: 'dept-mc-adv-1', departmentName: '传媒学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30601' },
  { id: 'tch-mc-adv-2', name: '江老师', email: 'jiang.t1@bwvtc.edu', initials: 'JT', departmentId: 'dept-mc-adv-2', departmentName: '传媒学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30602' },
  { id: 'tch-mc-adv-3', name: '史老师', email: 'shi.t1@bwvtc.edu', initials: 'ST', departmentId: 'dept-mc-adv-3', departmentName: '传媒学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30603' },
  { id: 'tch-mc-adv-4', name: '顾老师', email: 'gu.t1@bwvtc.edu', initials: 'GT', departmentId: 'dept-mc-adv-4', departmentName: '传媒学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30604' },
  { id: 'tch-mc-adv-5', name: '侯老师', email: 'hou.t1@bwvtc.edu', initials: 'HT', departmentId: 'dept-mc-adv-5', departmentName: '传媒学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30605' },
  { id: 'tch-mc-adv-6', name: '龚老师', email: 'gong.t1@bwvtc.edu', initials: 'GT', departmentId: 'dept-mc-adv-6', departmentName: '传媒学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T30606' },

  // 游戏学院
  { id: 'tch-gd-pro-1', name: '邹老师', email: 'zou.t1@bwvtc.edu', initials: 'ZT', departmentId: 'dept-gd-pro-1', departmentName: '游戏学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40101' },
  { id: 'tch-gd-pro-2', name: '熊老师', email: 'xiong.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-gd-pro-2', departmentName: '游戏学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40102' },
  { id: 'tch-gd-pro-3', name: '金老师', email: 'jin.t1@bwvtc.edu', initials: 'JT', departmentId: 'dept-gd-pro-3', departmentName: '游戏学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40103' },
  { id: 'tch-gd-pro-4', name: '陆老师', email: 'lu.t1@bwvtc.edu', initials: 'LT', departmentId: 'dept-gd-pro-4', departmentName: '游戏学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40104' },
  { id: 'tch-gd-pro-5', name: '苏老师', email: 'su.t1@bwvtc.edu', initials: 'ST', departmentId: 'dept-gd-pro-5', departmentName: '游戏学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40105' },
  { id: 'tch-gd-adv-1', name: '丁老师', email: 'ding.t1@bwvtc.edu', initials: 'DT', departmentId: 'dept-gd-adv-1', departmentName: '游戏学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40601' },
  { id: 'tch-gd-adv-2', name: '程老师', email: 'cheng.t1@bwvtc.edu', initials: 'CT', departmentId: 'dept-gd-adv-2', departmentName: '游戏学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40602' },
  { id: 'tch-gd-adv-3', name: '傅老师', email: 'fu.t1@bwvtc.edu', initials: 'FT', departmentId: 'dept-gd-adv-3', departmentName: '游戏学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40603' },
  { id: 'tch-gd-adv-4', name: '沈老师', email: 'shen.t1@bwvtc.edu', initials: 'ST', departmentId: 'dept-gd-adv-4', departmentName: '游戏学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40604' },
  { id: 'tch-gd-adv-5', name: '范老师', email: 'fan.t1@bwvtc.edu', initials: 'FT', departmentId: 'dept-gd-adv-5', departmentName: '游戏学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40605' },
  { id: 'tch-gd-adv-6', name: '彭老师', email: 'peng.t1@bwvtc.edu', initials: 'PT', departmentId: 'dept-gd-adv-6', departmentName: '游戏学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T40606' },

  // 鸿蒙学院
  { id: 'tch-hm-pro-1', name: '卢老师', email: 'lu.t2@bwvtc.edu', initials: 'LT', departmentId: 'dept-hm-pro-1', departmentName: '鸿蒙学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50101' },
  { id: 'tch-hm-pro-2', name: '薛老师', email: 'xue.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-hm-pro-2', departmentName: '鸿蒙学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50102' },
  { id: 'tch-hm-pro-3', name: '康老师', email: 'kang.t1@bwvtc.edu', initials: 'KT', departmentId: 'dept-hm-pro-3', departmentName: '鸿蒙学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50103' },
  { id: 'tch-hm-pro-4', name: '贺老师', email: 'he.t2@bwvtc.edu', initials: 'HT', departmentId: 'dept-hm-pro-4', departmentName: '鸿蒙学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50104' },
  { id: 'tch-hm-pro-5', name: '莫老师', email: 'mo.t1@bwvtc.edu', initials: 'MT', departmentId: 'dept-hm-pro-5', departmentName: '鸿蒙学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50105' },
  { id: 'tch-hm-adv-1', name: '孔老师', email: 'kong.t1@bwvtc.edu', initials: 'KT', departmentId: 'dept-hm-adv-1', departmentName: '鸿蒙学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50601' },
  { id: 'tch-hm-adv-2', name: '毛老师', email: 'mao.t1@bwvtc.edu', initials: 'MT', departmentId: 'dept-hm-adv-2', departmentName: '鸿蒙学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50602' },
  { id: 'tch-hm-adv-3', name: '尹老师', email: 'yin.t1@bwvtc.edu', initials: 'YT', departmentId: 'dept-hm-adv-3', departmentName: '鸿蒙学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50603' },
  { id: 'tch-hm-adv-4', name: '姜老师', email: 'jiang.t2@bwvtc.edu', initials: 'JT', departmentId: 'dept-hm-adv-4', departmentName: '鸿蒙学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50604' },
  { id: 'tch-hm-adv-5', name: '戴老师', email: 'dai.t1@bwvtc.edu', initials: 'DT', departmentId: 'dept-hm-adv-5', departmentName: '鸿蒙学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50605' },
  { id: 'tch-hm-adv-6', name: '崔老师', email: 'cui.t1@bwvtc.edu', initials: 'CT', departmentId: 'dept-hm-adv-6', departmentName: '鸿蒙学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T50606' },

  // 大数据学院
  { id: 'tch-bd-pro-1', name: '任老师', email: 'ren.t1@bwvtc.edu', initials: 'RT', departmentId: 'dept-bd-pro-1', departmentName: '大数据学院 · 专业一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60101' },
  { id: 'tch-bd-pro-2', name: '魏老师', email: 'wei.t1@bwvtc.edu', initials: 'WT', departmentId: 'dept-bd-pro-2', departmentName: '大数据学院 · 专业二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60102' },
  { id: 'tch-bd-pro-3', name: '白老师', email: 'bai.t1@bwvtc.edu', initials: 'BT', departmentId: 'dept-bd-pro-3', departmentName: '大数据学院 · 专业三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60103' },
  { id: 'tch-bd-pro-4', name: '萧老师', email: 'xiao.t1@bwvtc.edu', initials: 'XT', departmentId: 'dept-bd-pro-4', departmentName: '大数据学院 · 专业四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60104' },
  { id: 'tch-bd-pro-5', name: '田老师', email: 'tian.t1@bwvtc.edu', initials: 'TT', departmentId: 'dept-bd-pro-5', departmentName: '大数据学院 · 专业五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60105' },
  { id: 'tch-bd-adv-1', name: '董老师', email: 'dong.t1@bwvtc.edu', initials: 'DT', departmentId: 'dept-bd-adv-1', departmentName: '大数据学院 · 专高一', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60601' },
  { id: 'tch-bd-adv-2', name: '贾老师', email: 'jia.t1@bwvtc.edu', initials: 'JT', departmentId: 'dept-bd-adv-2', departmentName: '大数据学院 · 专高二', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60602' },
  { id: 'tch-bd-adv-3', name: '苗老师', email: 'miao.t1@bwvtc.edu', initials: 'MT', departmentId: 'dept-bd-adv-3', departmentName: '大数据学院 · 专高三', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60603' },
  { id: 'tch-bd-adv-4', name: '段老师', email: 'duan.t1@bwvtc.edu', initials: 'DT', departmentId: 'dept-bd-adv-4', departmentName: '大数据学院 · 专高四', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60604' },
  { id: 'tch-bd-adv-5', name: '黎老师', email: 'li.t2@bwvtc.edu', initials: 'LT', departmentId: 'dept-bd-adv-5', departmentName: '大数据学院 · 专高五', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60605' },
  { id: 'tch-bd-adv-6', name: '纪老师', email: 'ji.t1@bwvtc.edu', initials: 'JT', departmentId: 'dept-bd-adv-6', departmentName: '大数据学院 · 专高六', roleIds: ['role-lecturer'], roleName: '讲师', accessStatus: 'full', userType: 'staff', loginId: 'T60606' },


  {
    id: 'stu-fs-pro1-001',
    name: '林小雨',
    email: 'lin.xiaoyu@stu.bwvtc.edu',
    initials: 'LX',
    departmentId: 'dept-fs-pro-1',
    departmentName: '全栈开发学院 · 专业一',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2024010101',
    grade: '2024级',
    classId: 'dept-fs-pro-1',
    className: '专业一',
  },
  {
    id: 'stu-fs-pro1-002',
    name: '王大明',
    email: 'wang.daming@stu.bwvtc.edu',
    initials: 'WD',
    departmentId: 'dept-fs-pro-1',
    departmentName: '全栈开发学院 · 专业一',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2024010102',
    grade: '2024级',
    classId: 'dept-fs-pro-1',
    className: '专业一',
  },
  {
    id: 'stu-fs-adv1-001',
    name: '赵文静',
    email: 'zhao.wenjing@stu.bwvtc.edu',
    initials: 'ZW',
    departmentId: 'dept-fs-adv-1',
    departmentName: '全栈开发学院 · 专高一',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2023010601',
    grade: '2023级',
    classId: 'dept-fs-adv-1',
    className: '专高一',
  },

  // ======================================================
  // 学生 — 云计算学院
  // ======================================================
  {
    id: 'stu-cc-pro2-001',
    name: '陈建平',
    email: 'chen.jianping@stu.bwvtc.edu',
    initials: 'CJ',
    departmentId: 'dept-cc-pro-2',
    departmentName: '云计算学院 · 专业二',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2024020201',
    grade: '2024级',
    classId: 'dept-cc-pro-2',
    className: '专业二',
  },
  {
    id: 'stu-cc-adv3-001',
    name: '刘芳芳',
    email: 'liu.fangfang@stu.bwvtc.edu',
    initials: 'LF',
    departmentId: 'dept-cc-adv-3',
    departmentName: '云计算学院 · 专高三',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'partial',
    userType: 'student',
    loginId: '2023020803',
    grade: '2023级',
    classId: 'dept-cc-adv-3',
    className: '专高三',
  },

  // ======================================================
  // 学生 — 游戏学院
  // ======================================================
  {
    id: 'stu-gd-pro3-001',
    name: '孙志远',
    email: 'sun.zhiyuan@stu.bwvtc.edu',
    initials: 'SZ',
    departmentId: 'dept-gd-pro-3',
    departmentName: '游戏学院 · 专业三',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2024040301',
    grade: '2024级',
    classId: 'dept-gd-pro-3',
    className: '专业三',
  },
  {
    id: 'stu-gd-adv2-001',
    name: '周晓燕',
    email: 'zhou.xiaoyan@stu.bwvtc.edu',
    initials: 'ZX',
    departmentId: 'dept-gd-adv-2',
    departmentName: '游戏学院 · 专高二',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'inactive',
    userType: 'student',
    loginId: '2023040702',
    grade: '2023级',
    classId: 'dept-gd-adv-2',
    className: '专高二',
  },

  // ======================================================
  // 学生 — 大数据学院
  // ======================================================
  {
    id: 'stu-bd-pro5-001',
    name: '吴浩然',
    email: 'wu.haoran@stu.bwvtc.edu',
    initials: 'WH',
    departmentId: 'dept-bd-pro-5',
    departmentName: '大数据学院 · 专业五',
    roleIds: [],
    roleName: '学生',
    accessStatus: 'full',
    userType: 'student',
    loginId: '2024060501',
    grade: '2024级',
    classId: 'dept-bd-pro-5',
    className: '专业五',
  },
];

/** 总统计 */
export const userStats = {
  total: users.length,
  active: users.filter((u) => u.accessStatus !== 'inactive').length,
};

/** 按部门过滤 */
export function getUsersByDepartment(departmentId: string): UserInfo[] {
  return users.filter((u) => u.departmentId === departmentId);
}

/** 按角色过滤 */
export function getUsersByRole(roleId: string): UserInfo[] {
  return users.filter((u) => u.roleIds.includes(roleId));
}

/** 按 id 查找 */
export function findUserById(id: string): UserInfo | undefined {
  return users.find((u) => u.id === id);
}
