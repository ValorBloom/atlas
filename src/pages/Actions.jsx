// Actions is now consolidated into Home.
// This page redirects so any bookmarked /actions links still work.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Actions() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, []);
  return null;
}