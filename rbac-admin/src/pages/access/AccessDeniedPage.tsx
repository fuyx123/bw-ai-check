import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Space, Tag } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

interface AccessDeniedPageProps {
  pageName?: string;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ pageName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);

  const roleName = currentUser?.role || '当前账号';
  const requestedPage = pageName || location.pathname;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 112px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 0',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          borderRadius: 28,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
          border: '1px solid rgba(15, 25, 35, 0.08)',
          boxShadow: '0 18px 48px rgba(15, 25, 35, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 6,
            background: 'linear-gradient(90deg, #1a2332 0%, #1677ff 55%, #8fb4ff 100%)',
          }}
        />

        <div
          style={{
            padding: '40px 44px 36px',
            display: 'grid',
            gap: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                background: 'linear-gradient(135deg, #1a2332 0%, #2a3f5f 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
                boxShadow: '0 12px 24px rgba(26, 35, 50, 0.18)',
              }}
            >
              <SafetyOutlined />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <Tag
                color="default"
                style={{
                  width: 'fit-content',
                  margin: 0,
                  padding: '4px 10px',
                  borderRadius: 999,
                  borderColor: '#d9e2f2',
                  color: '#1a2332',
                  background: '#f7faff',
                }}
              >
                访问受限
              </Tag>
              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  lineHeight: 1.2,
                  color: '#1a1a2e',
                  fontWeight: 700,
                }}
              >
                这个页面暂时还没有向你开放
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.9,
                  color: '#5b6472',
                  maxWidth: 620,
                }}
              >
                别担心，这不是系统故障。你当前以
                <span style={{ color: '#1a2332', fontWeight: 600 }}> {roleName} </span>
                身份登录，暂未开通
                <span style={{ color: '#1a2332', fontWeight: 600 }}>「{requestedPage}」</span>
                的访问权限。你仍然可以继续使用左侧已开放的功能，如确有业务需要，可联系管理员协助开通。
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 18,
                background: '#ffffff',
                border: '1px solid #edf1f7',
              }}
            >
              <div style={{ fontSize: 12, color: '#8a93a3', marginBottom: 8 }}>当前身份</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2332' }}>{roleName}</div>
            </div>
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 18,
                background: '#ffffff',
                border: '1px solid #edf1f7',
              }}
            >
              <div style={{ fontSize: 12, color: '#8a93a3', marginBottom: 8 }}>尝试访问</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2332' }}>{requestedPage}</div>
            </div>
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 18,
                background: '#f7faff',
                border: '1px dashed #c9d8ef',
              }}
            >
              <div style={{ fontSize: 12, color: '#8a93a3', marginBottom: 8 }}>温馨提示</div>
              <div style={{ fontSize: 14, lineHeight: 1.8, color: '#4d5563' }}>
                如果你刚刚完成角色调整，退出后重新登录一次，权限会更快同步到当前界面。
              </div>
            </div>
          </div>

          <Space size={12} wrap>
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/dashboard', { replace: true })}
              style={{
                height: 46,
                paddingInline: 20,
                borderRadius: 12,
                background: '#1a2332',
              }}
            >
              返回工作台
            </Button>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={handleGoBack}
              style={{
                height: 46,
                paddingInline: 20,
                borderRadius: 12,
              }}
            >
              返回上一页
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
