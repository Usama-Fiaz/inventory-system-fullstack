import PasswordFormInput from '@/components/form/PasswordFormInput';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
const LockScreenForm = () => {
  const lockScreenSchema = yup.object({
    password: yup.string().required('Please enter your password')
  });
  const {
    control,
    handleSubmit
  } = useForm({
    resolver: yupResolver(lockScreenSchema)
  });
  return <form className="authentication-form" onSubmit={handleSubmit(() => {})}>
      <PasswordFormInput control={control} name="password" containerClassName="mb-3" placeholder="Enter your password" id="password-id" />
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit">
          Sign In
        </Button>
      </div>
    </form>;
};
export default LockScreenForm;