import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  TextInput,
  Button,
  Surface,
  Text,
  HelperText,
  List,
  Divider,
  Card,
  IconButton
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const REQUIRED_ASSETS = {
  icon: { width: 512, height: 512, type: 'PNG' },
  featureGraphic: { width: 1024, height: 500, type: 'PNG' },
  screenshots: { min: 2, max: 8, type: 'PNG' }
};

export default function StoreSubmissionHelper() {
  const router = useRouter();
  const [storeData, setStoreData] = useState({
    shortDescription: '',
    fullDescription: '',
    privacyPolicyUrl: '',
    icon: null,
    featureGraphic: null,
    screenshots: [],
    contactEmail: '',
    contactPhone: ''
  });
  const [errors, setErrors] = useState({});

  const validateAsset = async (asset, requirements) => {
    if (!asset) return false;
    // Add image dimension and type validation logic here
    return true;
  };

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      if (type === 'screenshots') {
        setStoreData(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, result.assets[0]]
        }));
      } else {
        setStoreData(prev => ({
          ...prev,
          [type]: result.assets[0]
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!storeData.shortDescription) {
      newErrors.shortDescription = 'Short description is required';
    }
    if (!storeData.fullDescription) {
      newErrors.fullDescription = 'Full description is required';
    }
    if (!storeData.privacyPolicyUrl) {
      newErrors.privacyPolicyUrl = 'Privacy policy URL is required';
    }
    if (!storeData.icon) {
      newErrors.icon = 'App icon is required';
    }
    if (!storeData.featureGraphic) {
      newErrors.featureGraphic = 'Feature graphic is required';
    }
    if (storeData.screenshots.length < REQUIRED_ASSETS.screenshots.min) {
      newErrors.screenshots = `At least ${REQUIRED_ASSETS.screenshots.min} screenshots required`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('shortDescription', storeData.shortDescription);
      formData.append('fullDescription', storeData.fullDescription);
      formData.append('privacyPolicyUrl', storeData.privacyPolicyUrl);
      formData.append('contactEmail', storeData.contactEmail);
      formData.append('contactPhone', storeData.contactPhone);

      // Append images
      if (storeData.icon) {
        formData.append('icon', {
          uri: storeData.icon.uri,
          type: 'image/png',
          name: 'icon.png'
        });
      }

      if (storeData.featureGraphic) {
        formData.append('featureGraphic', {
          uri: storeData.featureGraphic.uri,
          type: 'image/png',
          name: 'feature.png'
        });
      }

      storeData.screenshots.forEach((screenshot, index) => {
        formData.append(`screenshot${index}`, {
          uri: screenshot.uri,
          type: 'image/png',
          name: `screenshot${index}.png`
        });
      });

      const response = await fetch(`${apiUrl}/api/store-submission`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit store listing');
      }

      router.push('/(tabs)/dashboard');
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium">Store Listing Helper</Text>
        
        <TextInput
          label="Short Description"
          value={storeData.shortDescription}
          onChangeText={text => setStoreData(prev => ({ ...prev, shortDescription: text }))}
          error={!!errors.shortDescription}
          style={styles.input}
          multiline
        />
        <HelperText type="error" visible={!!errors.shortDescription}>
          {errors.shortDescription}
        </HelperText>

        <TextInput
          label="Full Description"
          value={storeData.fullDescription}
          onChangeText={text => setStoreData(prev => ({ ...prev, fullDescription: text }))}
          error={!!errors.fullDescription}
          style={styles.input}
          multiline
          numberOfLines={4}
        />
        <HelperText type="error" visible={!!errors.fullDescription}>
          {errors.fullDescription}
        </HelperText>

        <TextInput
          label="Privacy Policy URL"
          value={storeData.privacyPolicyUrl}
          onChangeText={text => setStoreData(prev => ({ ...prev, privacyPolicyUrl: text }))}
          error={!!errors.privacyPolicyUrl}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.privacyPolicyUrl}>
          {errors.privacyPolicyUrl}
        </HelperText>

        <Card style={styles.imageSection}>
          <Card.Title title="App Icon (512x512 PNG)" />
          <Card.Content>
            <Button
              mode="outlined"
              onPress={() => pickImage('icon')}
              style={styles.imageButton}
            >
              {storeData.icon ? 'Change Icon' : 'Upload Icon'}
            </Button>
            {errors.icon && <HelperText type="error">{errors.icon}</HelperText>}
          </Card.Content>
        </Card>

        <Card style={styles.imageSection}>
          <Card.Title title="Feature Graphic (1024x500 PNG)" />
          <Card.Content>
            <Button
              mode="outlined"
              onPress={() => pickImage('featureGraphic')}
              style={styles.imageButton}
            >
              {storeData.featureGraphic ? 'Change Feature Graphic' : 'Upload Feature Graphic'}
            </Button>
            {errors.featureGraphic && <HelperText type="error">{errors.featureGraphic}</HelperText>}
          </Card.Content>
        </Card>

        <Card style={styles.imageSection}>
          <Card.Title title={`Screenshots (${REQUIRED_ASSETS.screenshots.min}-${REQUIRED_ASSETS.screenshots.max})`} />
          <Card.Content>
            <Button
              mode="outlined"
              onPress={() => pickImage('screenshots')}
              style={styles.imageButton}
              disabled={storeData.screenshots.length >= REQUIRED_ASSETS.screenshots.max}
            >
              Add Screenshot
            </Button>
            <Text style={styles.screenshotCount}>
              {storeData.screenshots.length} of {REQUIRED_ASSETS.screenshots.max} screenshots added
            </Text>
            {errors.screenshots && <HelperText type="error">{errors.screenshots}</HelperText>}
          </Card.Content>
        </Card>

        <TextInput
          label="Contact Email"
          value={storeData.contactEmail}
          onChangeText={text => setStoreData(prev => ({ ...prev, contactEmail: text }))}
          style={styles.input}
        />

        <TextInput
          label="Contact Phone"
          value={storeData.contactPhone}
          onChangeText={text => setStoreData(prev => ({ ...prev, contactPhone: text }))}
          style={styles.input}
        />

        {errors.submit && (
          <HelperText type="error" visible={true}>
            {errors.submit}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          Prepare Store Submission
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  input: {
    marginVertical: 8,
  },
  imageSection: {
    marginVertical: 8,
  },
  imageButton: {
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 24,
  },
  screenshotCount: {
    marginTop: 8,
    textAlign: 'center',
  },
});
