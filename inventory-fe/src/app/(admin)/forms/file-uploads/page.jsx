import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import DropzoneFormInput from '@/components/form/DropzoneFormInput';
import PageMetaData from '@/components/PageTitle';
const FileUploads = () => {
  return <>
      <PageMetaData title="File Uploads" />

      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <CardTitle as={'h5'} className="mb-1 anchor" id="overview">
                Overview
                <a className="btn btn-sm btn-outline-success rounded-2 float-end" href="https://www.npmjs.com/package/react-dropzone" target="_blank">
                  Official Website
                </a>
              </CardTitle>
              <p className="text-muted mb-3">Dropzone is a lightweight and powerful datetime picker.</p>
            </CardBody>
          </Card>
          <ComponentContainerCard id="default" title="Dropzone File Upload" description="DropzoneJS is an open source library that provides drag’n’drop file uploads with image previews.">
            <DropzoneFormInput iconProps={{
            icon: 'bx:cloud-upload',
            height: 36,
            width: 36
          }} text="Drop files here or click to upload." helpText={<span className="text-muted fs-13">
                  (This is just a demo dropzone. Selected files are <strong>not</strong> actually uploaded.)
                </span>} showPreview />
          </ComponentContainerCard>
        </Col>
      </Row>
    </>;
};
export default FileUploads;