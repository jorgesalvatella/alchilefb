
import { render, screen } from '@testing-library/react';
import TermsAndConditionsPage from '@/app/terminos-y-condiciones/page';

describe('TermsAndConditionsPage', () => {
  it('should render the main heading', () => {
    render(<TermsAndConditionsPage />);
    
    const heading = screen.getByRole('heading', { 
      name: /Términos y Condiciones/i,
      level: 1 
    });
    
    expect(heading).toBeInTheDocument();
  });

  it('should render the contact email link', () => {
    render(<TermsAndConditionsPage />);
    
    const emailLink = screen.getByText('chiel@alchilemeatballs.com');
    
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:chiel@alchilemeatballs.com');
  });
});
