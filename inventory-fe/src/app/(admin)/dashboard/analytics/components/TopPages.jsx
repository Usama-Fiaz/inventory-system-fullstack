import { Button, Card, CardHeader, CardTitle, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { topPages } from '../data';
const TopPages = () => {
  return <Card className="card-height-100">
      <CardHeader className="d-flex align-items-center justify-content-between gap-2">
        <CardTitle as="h4" className="flex-grow-1">
          Top Pages
        </CardTitle>
        <div>
          <Button variant="soft-primary" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <div className="table-responsive">
        <Table className="table-hover table-nowrap table-centered m-0">
          <thead className="bg-light bg-opacity-50">
            <tr>
              <th className="text-muted py-1">Page Path</th>
              <th className="text-muted py-1">Page Views</th>
              <th className="text-muted py-1">Avg Time on Page</th>
              <th className="text-muted py-1">Exit Rate</th>
            </tr>
          </thead>
          <tbody>
            {topPages.map((page, idx) => <tr key={idx}>
                <td>
                  <Link to="" className="text-muted">
                    {page.path}
                  </Link>
                </td>
                <td> {page.views}</td>
                <td>{page.avgTime}</td>
                <td>
                  <span className={`badge badge-soft-${page.variant}`}>{page.exitRate}%</span>
                </td>
              </tr>)}
          </tbody>
        </Table>
      </div>
    </Card>;
};
export default TopPages;