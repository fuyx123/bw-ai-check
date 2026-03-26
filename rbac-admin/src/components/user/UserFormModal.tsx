import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, TreeSelect, Switch, Divider, Spin } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { DataNode } from 'antd/es/tree';
import { useRoleStore } from '../../stores/roleStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import FileUpload from '../common/FileUpload';
import type { UserInfo, Department } from '../../types/rbac';

interface UserFormModalProps {
  mode: 'add' | 'edit';
  visible: boolean;
  user?: UserInfo | null;
  form: FormInstance;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: Partial<UserInfo>) => void;
}

/**
 * 用户表单对话框组件
 * 支持新增和编辑两种模式，动态处理学生/教职工差异字段
 */
/**
 * 将树形部门数据转换为 TreeSelect 需要的格式
 */
function convertDepartmentsToTreeData(
  departments: Department[],
  prefix = ''
): DataNode[] {
  return departments.map((dept) => ({
    key: dept.id,
    title: `${prefix}${dept.name}`,
    value: dept.id,
    children: dept.children && dept.children.length > 0
      ? convertDepartmentsToTreeData(dept.children, prefix + '  ')
      : undefined,
  }));
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  mode,
  visible,
  user,
  form,
  loading = false,
  onCancel,
  onSubmit,
}) => {
  const roles = useRoleStore((s) => s.roles);
  const allDepartments = useDepartmentStore((s) => s.departments);
  const flatDepartments = useDepartmentStore((s) => s.flatDepartments);
  const userType = Form.useWatch('userType', form) || 'staff';

  // 转换树形结构用于 TreeSelect 显示
  const departmentTreeData = useMemo(() => {
    return convertDepartmentsToTreeData(allDepartments);
  }, [allDepartments]);

  // 初始化表单数据
  useEffect(() => {
    if (!visible) return;

    if (mode === 'edit' && user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        loginId: user.loginId,
        userType: user.userType,
        departmentId: user.departmentId,
        roleIds: user.roleIds,
        accessStatus: user.accessStatus,
        isActive: user.isActive,
        ...(user.userType === 'student' && {
          grade: user.grade,
          className: user.className,
          classId: user.classId,
        }),
      });
    } else {
      form.resetFields();
      form.setFieldValue('userType', 'staff');
      form.setFieldValue('isActive', true);
      form.setFieldValue('accessStatus', 'full');
    }
  }, [visible, mode, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      // 表单验证失败
    }
  };

  const title = mode === 'edit' ? `编辑用户 — ${user?.name}` : '新增用户';
  const okText = mode === 'edit' ? '保存' : '创建';

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText={okText}
      cancelText="取消"
      width={520}
      maskClosable={false}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          {/* === 基础信息 === */}
          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, max: 50, message: '姓名长度 2-50 字符' },
            ]}
          >
            <Input placeholder="如：赵明远" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="如：zhao@seuu.edu" disabled={mode === 'edit'} />
          </Form.Item>

          {/* === 用户类型与登录凭证 === */}
          <Form.Item
            name="userType"
            label="用户类型"
            rules={[{ required: true }]}
          >
            <Select disabled={mode === 'edit'} placeholder="选择用户类型">
              <Select.Option value="staff">教职工</Select.Option>
              <Select.Option value="student">学生</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="loginId"
            label={userType === 'student' ? '学号' : '职工号'}
            rules={[
              { required: true, message: '请输入登录凭证' },
              { pattern: /^[a-zA-Z0-9]+$/, message: '只允许字母和数字' },
            ]}
          >
            <Input
              placeholder={userType === 'student' ? '如：2024010101' : '如：E001'}
              disabled={mode === 'edit'}
            />
          </Form.Item>

          {/* === 部门与角色 === */}
          <Form.Item
            name="departmentId"
            label="所属部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <TreeSelect
              placeholder="选择部门"
              treeData={departmentTreeData}
              treeDefaultExpandAll={false}
              showSearch
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* 教职工角色选择 */}
          {userType === 'staff' && (
            <Form.Item
              name="roleIds"
              label="角色"
              rules={[{ required: true, message: '请至少选择一个角色' }]}
            >
              <Select mode="multiple" placeholder="选择角色（可多选）">
                {roles.map((role) => (
                  <Select.Option key={role.id} value={role.id}>
                    {role.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {/* === 学生专属字段 === */}
          {userType === 'student' && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                学生专属信息
              </div>

              <Form.Item
                name="grade"
                label="年级"
                rules={[{ required: true, message: '请输入年级' }]}
              >
                <Input placeholder="如：2024级" />
              </Form.Item>

              <Form.Item
                name="className"
                label="班级名称"
                rules={[{ required: true, message: '请输入班级名称' }]}
              >
                <Input placeholder="如：计科2301" />
              </Form.Item>

              <Form.Item
                name="classId"
                label="班级ID"
                rules={[{ required: true, message: '请选择班级ID' }]}
              >
                <TreeSelect
                  placeholder="选择班级"
                  treeData={departmentTreeData}
                  treeDefaultExpandAll={false}
                  showSearch
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          {/* === 头像上传 === */}
          <Form.Item
            name="avatar"
            label="头像"
          >
            <FileUpload
              accept="image/*"
              maxSize={5}
              previewMode="image"
              defaultFileList={
                user?.avatar
                  ? [
                      {
                        uid: 'avatar',
                        name: 'avatar.jpg',
                        status: 'done',
                        url: user.avatar,
                      } as any,
                    ]
                  : []
              }
              onUpload={(files) => {
                const file = files[0];
                if (file?.url) {
                  form.setFieldValue('avatar', file.url);
                }
              }}
            />
          </Form.Item>

          {/* === 权限和状态 === */}
          <Divider style={{ margin: '16px 0' }} />

          <Form.Item
            name="accessStatus"
            label="访问权限"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择权限状态">
              <Select.Option value="full">完全权限</Select.Option>
              <Select.Option value="partial">部分权限</Select.Option>
              <Select.Option value="inactive">无权限</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="激活状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default UserFormModal;
