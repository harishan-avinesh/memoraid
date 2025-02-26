import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper,
  Divider,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  IconButton,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PhotoUpload from './PhotoUpload';
import { submitMemory } from '../services/api';

// Validation schema
const MemorySchema = Yup.object().shape({
  description: Yup.string()
    .required('Please provide a description of this memory')
    .min(10, 'Description should be at least 10 characters'),
  eventDate: Yup.date()
    .nullable()
    .typeError('Please enter a valid date')
});

const MemoryForm = ({ contributorId, onMemoryAdded, onComplete }) => {
  const [memories, setMemories] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePhotoUploaded = (file) => {
    setCurrentPhoto(file);
  };

  const handleAddMemory = async (values, { resetForm }) => {
    if (!currentPhoto) {
      setError('Please upload a photo for this memory');
      return;
    }

    setSubmitting(true);
    try {
      const newMemory = {
        photo: currentPhoto,
        description: values.description,
        eventDate: values.eventDate || null,
        contributorId
      };

      setMemories([...memories, newMemory]);
      setSuccess('Memory added successfully!');
      setCurrentPhoto(null);
      resetForm();
      
      if (onMemoryAdded) {
        onMemoryAdded(newMemory);
      }
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to save memory. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemory = (index) => {
    const updatedMemories = [...memories];
    updatedMemories.splice(index, 1);
    setMemories(updatedMemories);
  };

  const handleSubmitAll = async () => {
    if (memories.length === 0) {
      setError('Please add at least one memory');
      return;
    }

    setSubmitting(true);
    try {
      if (onComplete) {
        onComplete(memories);
      }
    } catch (err) {
      setError('Failed to submit memories. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Add Memories
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Upload photos and provide details about each memory to help with recognition.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <PhotoUpload onPhotoUploaded={handlePhotoUploaded} />
        
        {currentPhoto && (
          <Formik
            initialValues={{
              description: '',
              eventDate: ''
            }}
            validationSchema={MemorySchema}
            onSubmit={handleAddMemory}
          >
            {({ errors, touched, values, handleChange, handleSubmit }) => (
              <Form>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Describe this memory"
                  multiline
                  rows={4}
                  value={values.description}
                  onChange={handleChange}
                  error={touched.description && Boolean(errors.description)}
                  helperText={touched.description && errors.description}
                  margin="normal"
                  placeholder="What was happening in this photo? Who was there? What makes this memory special?"
                />
                
                <TextField
                  fullWidth
                  id="eventDate"
                  name="eventDate"
                  label="When did this happen? (Optional)"
                  type="date"
                  value={values.eventDate}
                  onChange={handleChange}
                  error={touched.eventDate && Boolean(errors.eventDate)}
                  helperText={touched.eventDate && errors.eventDate}
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  sx={{ mt: 2 }}
                >
                  Add This Memory
                </Button>
              </Form>
            )}
          </Formik>
        )}
      </Paper>
      
      {memories.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Added Memories ({memories.length})
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {memories.map((memory, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={URL.createObjectURL(memory.photo)}
                    alt={`Memory ${index + 1}`}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {memory.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteMemory(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmitAll}
              disabled={submitting}
              startIcon={submitting && <CircularProgress size={20} color="inherit" />}
            >
              {submitting ? 'Submitting...' : 'Submit All Memories'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MemoryForm;