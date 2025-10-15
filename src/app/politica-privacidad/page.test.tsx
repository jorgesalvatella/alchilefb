
import { render, screen } from '@testing-library/react';
import PrivacyPolicyPage from '@/app/politica-privacidad/page';

describe('PrivacyPolicyPage', () => {
  it('should render the privacy policy heading', () => {
    render(<PrivacyPolicyPage />);
    
    const heading = screen.getByRole('heading', { 
      name: /Política de Privacidad/i,
      level: 1 
    });
    
    expect(heading).toBeInTheDocument();
  });

  it('should render the contact email', () => {
    render(<PrivacyPolicyPage />);
    
    const emailLinks = screen.getAllByText('chiel@alchilemeatballs.com');
    
    expect(emailLinks[0]).toBeInTheDocument();
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:chiel@alchilemeatballs.com');
  });
});
