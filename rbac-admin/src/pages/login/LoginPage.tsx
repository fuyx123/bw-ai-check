import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Segmented } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import type { UserType } from '../../types/rbac';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('staff');
  const [form] = Form.useForm();

  const onUserTypeChange = (val: string | number) => {
    setUserType(val as UserType);
    form.resetFields(['username', 'password']);
  };

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password, userType);
      if (success) {
        message.success('登录成功');
        navigate('/dashboard', { replace: true });
      } else {
        message.error('账号或密码错误');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = userType === 'student';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ===== 左侧动态几何图形区域 ===== */}
      <div
        style={{
          width: '50%',
          background: 'linear-gradient(145deg, #2a2a2e 0%, #3d3d42 30%, #4a4a50 60%, #38383d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 紫色长方形 */}
        <div
          style={{
            position: 'absolute',
            width: 180,
            height: 280,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            borderRadius: 16,
            top: '15%',
            left: '18%',
            transform: 'rotate(-12deg)',
            boxShadow: '0 20px 60px rgba(124, 58, 237, 0.3)',
            animation: 'float1 6s ease-in-out infinite',
          }}
        />
        {/* 黑色长方形 */}
        <div
          style={{
            position: 'absolute',
            width: 140,
            height: 220,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d3f 100%)',
            borderRadius: 12,
            top: '25%',
            right: '22%',
            transform: 'rotate(8deg)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
            animation: 'float2 7s ease-in-out infinite',
          }}
        />
        {/* 橙色半圆 */}
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 100,
            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            borderRadius: '200px 200px 0 0',
            bottom: '22%',
            left: '25%',
            boxShadow: '0 12px 40px rgba(249, 115, 22, 0.3)',
            animation: 'float3 8s ease-in-out infinite',
          }}
        />
        {/* 黄色圆角矩形 */}
        <div
          style={{
            position: 'absolute',
            width: 160,
            height: 120,
            background: 'linear-gradient(135deg, #eab308 0%, #fde047 100%)',
            borderRadius: 24,
            bottom: '30%',
            right: '18%',
            transform: 'rotate(-6deg)',
            boxShadow: '0 14px 44px rgba(234, 179, 8, 0.25)',
            animation: 'float4 5s ease-in-out infinite',
          }}
        />

        {/* 左下角系统信息 */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            八维智能阅卷平台
          </div>
          <div>BAWEI AI MARKING PLATFORM</div>
        </div>

        {/* CSS 动画 */}
        <style>{`
          @keyframes float1 {
            0%, 100% { transform: rotate(-12deg) translateY(0); }
            50% { transform: rotate(-12deg) translateY(-20px); }
          }
          @keyframes float2 {
            0%, 100% { transform: rotate(8deg) translateY(0); }
            50% { transform: rotate(8deg) translateY(-16px); }
          }
          @keyframes float3 {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-12px) scale(1.03); }
          }
          @keyframes float4 {
            0%, 100% { transform: rotate(-6deg) translateY(0); }
            50% { transform: rotate(-6deg) translateY(-18px); }
          }
        `}</style>
      </div>

      {/* ===== 右侧登录表单 ===== */}
      <div
        style={{
          width: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafbfc',
        }}
      >
        <div style={{ width: 380, padding: '0 20px' }}>
          {/* 标题 */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
              欢迎回来
            </h1>
            <p style={{ fontSize: 14, color: '#999' }}>
              登录八维智能阅卷平台
            </p>
          </div>

          {/* 用户类型切换 */}
          <div style={{ marginBottom: 28 }}>
            <Segmented
              block
              value={userType}
              onChange={onUserTypeChange}
              options={[
                { label: '教职工登录', value: 'staff' },
                { label: '学生登录', value: 'student' },
              ]}
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* 表单 */}
          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 500 }}>{isStudent ? '学号 / 邮箱' : '职工号 / 邮箱'}</span>}
              rules={[{ required: true, message: '登录账号不能为空' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bbb' }} />}
                placeholder={isStudent ? '请输入学号或邮箱' : '请输入职工号或邮箱'}
                style={{ borderRadius: 8, height: 46 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 500 }}>密码</span>}
              rules={[
                { required: true, message: '密码不能为空' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="请输入密码"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                style={{ borderRadius: 8, height: 46 }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 46,
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  background: '#1a2332',
                }}
              >
                {loading ? '正在登录...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 测试账号提示 */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: '#f0f5ff',
              borderRadius: 8,
              border: '1px solid #d6e4ff',
            }}
          >
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: 600 }}>
              测试账号
            </div>
            {isStudent ? (
              <div style={{ fontSize: 12, color: '#999', lineHeight: 2 }}>
                <div>当前环境支持学号或邮箱登录</div>
                <div>学生：<code>student001</code> / <code>123456</code></div>
                <div>也支持邮箱：<code>student001@seuu.edu</code> / <code>123456</code></div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#999', lineHeight: 2 }}>
                <div>当前环境支持职工号或邮箱登录</div>
                <div>管理员：<code>admin</code> / <code>123456</code></div>
                <div>院长：<code>dean001</code> / <code>123456</code></div>
                <div>教务：<code>academic001</code> / <code>123456</code></div>
                <div>专业负责人：<code>major001</code> / <code>123456</code></div>
                <div>讲师：<code>lecturer001</code> / <code>123456</code></div>
                <div>行政：<code>office001</code> / <code>123456</code></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
