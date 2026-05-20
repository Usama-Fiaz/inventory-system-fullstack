import { useEffect, useState } from 'react';
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { currency } from '@/context/constants';
import { getAllInvoices } from '@/helpers/data';
const Invoices = () => {
  const [allInvoices, setAllInvoices] = useState();
  useEffect(() => {
    ;
    (async () => {
      const data = await getAllInvoices();
      setAllInvoices(data);
    })();
  }, []);
  return <>
      <PageMetaData title="Invoices" />

      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div className="search-bar">
                  <span>
                    <IconifyIcon icon="bx:search-alt" className="mb-1" />
                  </span>
                  <input type="search" className="form-control" id="search" placeholder="Search invoice..." />
                </div>
                <div>
                  <Button variant="success">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Create Invoice
                  </Button>
                </div>
              </div>
            </CardBody>
            <div>
              <div className="table-responsive table-centered">
                <table className="table text-nowrap mb-0">
                  <thead className="bg-light bg-opacity-50">
                    <tr>
                      <th className="border-0 py-2">Invoice ID</th>
                      <th className="border-0 py-2">Customer</th>
                      <th className="border-0 py-2">Created Date</th>
                      <th className="border-0 py-2">Due Date</th>
                      <th className="border-0 py-2">Amount</th>
                      <th className="border-0 py-2">Payment Status</th>
                      <th className="border-0 py-2">Via</th>
                      <th className="border-0 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices?.map((invoice, idx) => <tr key={idx}>
                        <td>
                          <Link to={`/invoices/${invoice.id}`} className="fw-medium">
                            #{invoice.id}
                          </Link>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            {invoice.customer && <img src={invoice.customer.image} alt="user-img" className="avatar-xs rounded-circle me-2" />}
                            <div>
                              <h5 className="fs-14 mt-1 fw-normal">{invoice.customer?.name}</h5>
                            </div>
                          </div>
                        </td>
                        <td>{invoice.customer && new Date(invoice.customer?.createdAt).toDateString()}&nbsp;</td>
                        <td> {invoice.order && new Date(invoice.order?.createdAt).toDateString()}</td>
                        <td>
                          {currency}
                          {invoice.product?.price}
                        </td>
                        <td>
                          <span className={`badge badge-soft-${invoice.order?.status === 'Cancelled' ? 'danger' : invoice.order?.status == 'Processing' ? 'warning' : 'success'}`}>
                            {invoice.order?.status}
                          </span>
                        </td>
                        <td>{invoice.order?.paymentMethod}</td>
                        <td>
                          <Button variant="soft-secondary" size="sm" type="button" className="me-2">
                            <IconifyIcon icon="bx:edit" className="fs-16" />
                          </Button>
                          <Button variant="soft-danger" size="sm" type="button">
                            <IconifyIcon icon="bx:trash" className="bx bx-trash fs-16" />
                          </Button>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
              <div className="align-items-center justify-content-between row g-0 text-center text-sm-start p-3 border-top">
                <div className="col-sm">
                  <div className="text-muted">
                    Showing&nbsp;
                    <span className="fw-semibold">10</span>&nbsp; of&nbsp;
                    <span className="fw-semibold">52</span>&nbsp; invoices
                  </div>
                </div>
                <Col sm="auto" className="mt-3 mt-sm-0">
                  <ul className="pagination pagination-rounded m-0">
                    <li className="page-item">
                      <Link to="" className="page-link">
                        <IconifyIcon icon="bx:left-arrow-alt" />
                      </Link>
                    </li>
                    <li className="page-item active">
                      <Link to="" className="page-link">
                        1
                      </Link>
                    </li>
                    <li className="page-item">
                      <Link to="" className="page-link">
                        2
                      </Link>
                    </li>
                    <li className="page-item">
                      <Link to="" className="page-link">
                        3
                      </Link>
                    </li>
                    <li className="page-item">
                      <Link to="" className="page-link">
                        <IconifyIcon icon="bx:right-arrow-alt" />
                      </Link>
                    </li>
                  </ul>
                </Col>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Invoices;