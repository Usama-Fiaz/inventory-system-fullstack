import TextFormInput from '@/components/form/TextFormInput';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
const ResetPassForm = () => {
  const resetPasswordSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('please enter your email')
  });
  const {
    control,
    handleSubmit
  } = useForm({
    resolver: yupResolver(resetPasswordSchema)
  });
  return <form className="authentication-form" onSubmit={handleSubmit(() => {})}>
      <TextFormInput control={control} name="email" containerClassName="mb-3" label="Email" id="email-id" placeholder="Enter your email" />
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit">
          Reset Password
        </Button>
      </div>
    </form>;
};
export default ResetPassForm;