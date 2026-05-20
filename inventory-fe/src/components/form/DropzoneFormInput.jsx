import { Col, FormLabel, FormText } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import useFileUploader from '@/hooks/useFileUploader';
import IconifyIcon from '../wrappers/IconifyIcon';
const DropzoneFormInput = ({
  label,
  labelClassName,
  helpText,
  iconProps,
  showPreview,
  text,
  textClassName,
  onFileUpload
}) => {
  const {
    selectedFiles,
    handleAcceptedFiles,
    removeFile
  } = useFileUploader(showPreview);
  return <>
      {label && <FormLabel className={labelClassName}>{label}</FormLabel>}

      <Dropzone onDrop={acceptedFiles => handleAcceptedFiles(acceptedFiles, onFileUpload)} maxFiles={5}>
        {({
        getRootProps,
        getInputProps
      }) => <>
            <div className="dropzone dropzone-custom">
              <div className="dz-message" {...getRootProps()}>
                <input {...getInputProps()} />
                <IconifyIcon icon={iconProps?.icon ?? 'bx:cloud-upload'} {...iconProps} />
                <h3 className={textClassName}>{text}</h3>
                {helpText && typeof helpText === 'string' ? <FormText>{helpText}</FormText> : helpText}
              </div>
            </div>
            {showPreview && selectedFiles.length > 0 && <div className="dz-preview row g-2 mt-2">
                {(selectedFiles || []).map(file => <Col xs={12} key={file.path}>
                    <div className="dz-image-preview dz-success dz-complete">
                      <div className="border rounded">
                        <div className="d-flex align-items-center p-2">
                          <div className="flex-shrink-0 me-3">
                            <div className="avatar-sm bg-light rounded">
                              {file.preview ? <img alt={file.path ?? ''} height={36} width={36} src={file.preview} className="img-fluid rounded d-block" /> : <div className="rounded bg-light text-center flex-centered px-1" style={{
                        height: 40,
                        width: 40
                      }}>
                                  {file.path?.split('.')[file.path?.split('.').length - 1]?.toUpperCase()}
                                </div>}
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="pt-1">
                              <h5 className="fs-14 mb-1" data-dz-name>
                                {' '}
                                {file.path ?? file.name}
                              </h5>
                              <p className="fs-13 text-muted mb-0" data-dz-size>
                                <strong>{file.formattedSize}</strong>
                              </p>
                              <strong className="error text-danger" data-dz-errormessage />
                            </div>
                          </div>
                          {removeFile && <div className="flex-shrink-0 ms-3">
                              <button onClick={() => removeFile(file)} data-dz-remove className="btn btn-sm btn-danger">
                                Delete
                              </button>
                            </div>}
                        </div>
                      </div>
                    </div>
                  </Col>)}
              </div>}
          </>}
      </Dropzone>
    </>;
};
export default DropzoneFormInput;