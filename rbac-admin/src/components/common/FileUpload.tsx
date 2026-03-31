import React, { useState } from 'react';
import { Upload, Button, Space, Image } from 'antd';
import message from '../../utils/message';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // MB
  multiple?: boolean;
  previewMode?: 'image' | 'list' | 'none';
  onUpload?: (fileList: UploadFile[]) => void;
  onRemove?: (file: UploadFile) => void;
  defaultFileList?: UploadFile[];
  disabled?: boolean;
}

/**
 * 通用文件上传组件
 * 支持单文件/多文件上传、图片预览、拖拽上传
 *
 * @example
 * <FileUpload
 *   accept="image/*"
 *   maxSize={5}
 *   previewMode="image"
 *   onUpload={(files) => console.log(files)}
 * />
 */
const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10,
  multiple = false,
  previewMode = 'list',
  onUpload,
  onRemove,
  defaultFileList = [],
  disabled = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>(defaultFileList);

  const beforeUpload = (file: RcFile) => {
    // 文件大小检查
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return false;
    }
    return true;
  };

  const handleChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    // Mock 上传：模拟成功，转换为 Data URL 进行预览
    const processedList = newFileList.map((file) => {
      if (!file.url && file.originFileObj) {
        return {
          ...file,
          status: 'done' as const,
          url: URL.createObjectURL(file.originFileObj),
        } as UploadFile;
      }
      return file;
    });

    setFileList(processedList);
    onUpload?.(processedList);
  };

  const handleRemove = (file: UploadFile) => {
    const newList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newList);
    onRemove?.(file);
  };

  const uploadButton = (
    <Button icon={<UploadOutlined />} disabled={disabled}>
      选择文件
    </Button>
  );

  // 图片预览模式
  if (previewMode === 'image' && fileList.length > 0) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {fileList.map((file) => (
            <div key={file.uid} style={{ position: 'relative', width: 100, height: 100 }}>
              {file.url && (
                <Image
                  src={file.url}
                  alt={file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                  preview
                />
              )}
              <DeleteOutlined
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  color: '#ff4d4f',
                  cursor: 'pointer',
                  background: '#fff',
                  borderRadius: '50%',
                  padding: 2,
                }}
                onClick={() => handleRemove(file)}
              />
            </div>
          ))}
        </div>
        <Upload
          beforeUpload={beforeUpload}
          onChange={handleChange}
          fileList={[]}
          accept={accept}
          maxCount={multiple ? undefined : 1}
          listType="picture-card"
          disabled={disabled}
          openFileDialogOnClick
          showUploadList={false}
        >
          {uploadButton}
        </Upload>
      </Space>
    );
  }

  // 列表模式（默认）
  return (
    <Upload
      beforeUpload={beforeUpload}
      onChange={handleChange}
      fileList={fileList}
      accept={accept}
      multiple={multiple}
      maxCount={multiple ? undefined : 1}
      disabled={disabled}
      onRemove={handleRemove}
    >
      {uploadButton}
    </Upload>
  );
};

export default FileUpload;
