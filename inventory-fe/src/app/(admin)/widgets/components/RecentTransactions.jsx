import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import { currency } from '@/context/constants';
import { getAllTransactions } from '@/helpers/data';
import { useEffect, useState } from 'react';
const RecentTransactions = () => {
  const [allTransactions, setAllTransactions] = useState();
  useEffect(() => {
    ;
    (async () => {
      const data = await getAllTransactions();
      setAllTransactions(data);
    })();
  }, []);
  return <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle>Recent Transactions</CardTitle>
        <div>
          <Button variant="primary" size="sm">
            <span className="icons-center">
              <IconifyIcon icon="bx:plus" className="me-1" />
              Add
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <SimplebarReactClient className="px-3" style={{
        maxHeight: 406
      }}>
          <table className="table table-hover mb-0 table-centered">
            <tbody>
              {allTransactions && allTransactions.map((transaction, idx) => <tr key={idx}>
                    <td className="text-nowrap">{new Date(transaction.date).toDateString()}</td>
                    <td>
                      {currency}
                      {transaction.amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge bg-${transaction.status === 'Dr.' ? 'danger' : 'success'}`}>{transaction.status}</span>
                    </td>
                    <td>{transaction.description}</td>
                  </tr>)}
            </tbody>
          </table>
        </SimplebarReactClient>
      </CardBody>
    </Card>;
};
export default RecentTransactions;