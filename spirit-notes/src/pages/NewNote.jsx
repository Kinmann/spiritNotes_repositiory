import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db, auth, storage } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateFlavorDNA } from '@/api/flavorDna';
import { getNoteById } from '@/api/notes';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import styles from './NewNote.module.scss';

const NewNote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    distillery: '',
    category: '',
    categoryId: '',
    locationId: '',
    categoryHierarchy: [],
    locationHierarchy: [],
    abv: '',
    volume: '',
    rating: 3.5,
    peat: 0,
    floral: 0,
    fruity: 0,
    woody: 0,
    spicy: 0,
    sweet: 0,
    comment: '',
    spirit_id: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allSpirits, setAllSpirits] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      if (!id || !auth.currentUser) return;
      try {
        setLoading(true);
        const data = await getNoteById(auth.currentUser.uid, id);
        if (data) {
          setFormData({
            ...data,
            title: data.title || '',
            peat: data.flavor_axes?.peat || 0,
            floral: data.flavor_axes?.floral || 0,
            fruity: data.flavor_axes?.fruity || 0,
            woody: data.flavor_axes?.woody || 0,
            spicy: data.flavor_axes?.spicy || 0,
            sweet: data.flavor_axes?.sweet || 0,
            categoryHierarchy: data.categoryHierarchy || [],
            locationHierarchy: data.locationHierarchy || [],
            abv: data.abv || '',
            volume: data.volume || ''
          });
          if (data.imageUrl || data.image) {
            setImagePreview(data.imageUrl || data.image);
          }
        }
      } catch (error) {
        console.error("Error fetching note for edit:", error);
        toast.error("노트 데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (isEdit) {
      fetchNote();
    } else if (location.state?.spirit) {
      handleSelectSpirit(location.state.spirit);
    }
  }, [id, isEdit, location.state]);

  // 초기 마운트 시 spirits 전체 목록을 로드
  useEffect(() => {
    const loadAllSpirits = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'spirits'));
        const spirits = [];
        snapshot.forEach(doc => spirits.push({ id: doc.id, ...doc.data() }));
        setAllSpirits(spirits);
      } catch (error) {
        console.error('Failed to load spirits:', error);
      }
    };
    loadAllSpirits();
  }, []);

  const hasSpirit = !!formData.spirit_id;

  // 클라이언트 사이드 부분 문자열 검색 (대소문자 무시)
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const filtered = allSpirits.filter(s => 
      s.name?.toLowerCase().includes(query) ||
      s.distillery?.toLowerCase().includes(query)
    ).slice(0, 8);
    setSearchResults(filtered);
    setShowSearchDropdown(filtered.length > 0);
    setIsSearching(false);
  }, [searchQuery, allSpirits]);

  const handleSelectSpirit = async (spirit) => {
    setLoading(true);
    try {
      // 1. Basic spirit details
      const updateData = {
        name: spirit.name || '',
        distillery: spirit.distillery || '',  // 올바른 필드명
        abv: spirit.abv || '',
        volume: spirit.volume || '',
        peat: spirit.flavor_axes?.peat || 0,
        floral: spirit.flavor_axes?.floral || 0,
        fruity: spirit.flavor_axes?.fruity || 0,
        woody: spirit.flavor_axes?.woody || 0,
        spicy: spirit.flavor_axes?.spicy || 0,
        sweet: spirit.flavor_axes?.sweet || 0,
        spirit_id: spirit.id
      };

      // 2. Fetch Category Hierarchy
      const categoryPath = [];
      if (spirit.categoryId) {
        let currentId = spirit.categoryId;
        while (currentId) {
          const catSnap = await getDoc(doc(db, 'categories', currentId));
          if (catSnap.exists()) {
            const catData = catSnap.data();
            categoryPath.unshift(catData.name);
            currentId = catData.parentId;
          } else {
            currentId = null;
          }
        }
      }

      // 3. Fetch Location Hierarchy
      const locationPath = [];
      if (spirit.locationId) {
        let currentId = spirit.locationId;
        while (currentId) {
          const locSnap = await getDoc(doc(db, 'locations', currentId));
          if (locSnap.exists()) {
            const locData = locSnap.data();
            locationPath.unshift(locData.name);
            currentId = locData.parentId;
          } else {
            currentId = null;
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        ...updateData,
        categoryHierarchy: categoryPath,
        locationHierarchy: locationPath
      }));
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDropdown(false);
      
      if (spirit.image && !imageFile) {
        setImagePreview(spirit.image);
      }
    } catch (error) {
      console.error("Error populating spirit data:", error);
      toast.error("주류 정보를 가져오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (val) => {
    setFormData(prev => ({ ...prev, rating: val }));
  };

  const handleFlavorChange = (name, val) => {
    setFormData(prev => ({ ...prev, [name]: Number(val) }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (uid) => {
    if (!imageFile) return null;
    const fileName = `${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, `users/${uid}/notes/${fileName}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!auth.currentUser) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!formData.name) {
      toast.error('주류 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const imageUrl = await uploadImage(uid);

      const noteData = {
        title: formData.title || '',
        rating: formData.rating,
        comment: formData.comment,
        imageUrl: imageUrl || imagePreview || null, 
        flavor_axes: {
          peat: formData.peat,
          floral: formData.floral,
          fruity: formData.fruity,
          woody: formData.woody,
          spicy: formData.spicy,
          sweet: formData.sweet
        },
        spirit_id: formData.spirit_id || location.state?.spirit?.id || null, 
        createdAt: isEdit ? (formData.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'users', uid, 'notes', id), noteData);
      } else {
        if (!noteData.spirit_id) {
          toast.error('주류를 검색하여 선택해주세요.');
          setLoading(false);
          return;
        }
        await addDoc(collection(db, 'users', uid, 'notes'), noteData);
      }

      try {
        await updateFlavorDNA(uid);
      } catch (dnaError) {
        console.warn('Flavor DNA update skipped (Backend offline):', dnaError);
      }

      toast.success(isEdit ? '테이스팅 노트가 수정되었습니다.' : '테이스팅 노트가 안전하게 저장되었습니다.');
      navigate(isEdit ? `/notes/${id}` : '/');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('노트 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const flavorFields = [
    { name: 'peat', label: 'Peaty' },
    { name: 'floral', label: 'Floral' },
    { name: 'fruity', label: 'Fruity' },
    { name: 'woody', label: 'Woody' },
    { name: 'spicy', label: 'Spicy' },
    { name: 'sweet', label: 'Sweet' },
  ];

  const chartData = flavorFields.map(f => ({
    subject: f.label,
    value: formData[f.name]
  }));

  return (
    <div className={styles.newNotePage}>
      {/* Top Navigation Header */}
      <header className={styles.stickyHeader}>
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </header>

      <main className={styles.mainContent}>
        {/* Header Section: Title Input */}
        <section className={styles.titleSection}>
          <input 
            className={styles.noteTitleInput}
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter tasting name..."
          />
        </section>

        {/* Main Grid Content */}
        <div className={styles.mainGrid}>
          {/* Left Column: Image & Rating */}
          <div className={styles.leftCol}>
            {/* Image Upload / Preview */}
            <div className={styles.imageUploadCard} onClick={handleImageClick}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className={styles.hidden}
              />
              {imagePreview ? (
                <>
                  <img className={styles.previewImage} src={imagePreview} alt="Spirit preview" />
                  <div className={styles.imageOverlay}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                    <span>Update Photo</span>
                  </div>
                </>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                  <span className={styles.uploadLabel}>Upload Photo</span>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className={styles.ratingCard}>
              <h3 className={styles.cardLabel}>Personal Rating</h3>
              <div className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className="material-symbols-outlined cursor-pointer"
                    style={{ 
                      fontVariationSettings: star <= formData.rating ? "'FILL' 1" : "'FILL' 0",
                      color: star <= formData.rating ? 'var(--primary)' : 'var(--on-surface-variant)',
                      opacity: star <= formData.rating ? 1 : 0.3,
                      fontSize: '32px'
                    }}
                    onClick={() => handleRatingChange(star)}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>

          {/* Search Encyclopedia */}
          {!isEdit && (
            <div className={styles.searchWrapper}>
              <span className="material-symbols-outlined">search</span>
              <input 
                className={styles.searchInput}
                type="text"
                placeholder="Search Encyclopedia..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length < 1) setShowSearchDropdown(false);
                }}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />
              
              {showSearchDropdown && searchResults.length > 0 && (
                <div className={styles.searchDropdown}>
                  {searchResults.map(spirit => (
                    <div key={spirit.id} className={styles.searchResultItem} onMouseDown={() => handleSelectSpirit(spirit)}>
                      <div className={styles.resultInfo}>
                        <div className={styles.resultName}>{spirit.name}</div>
                        <div className={styles.resultMeta}>
                          {spirit.distillery && `${spirit.distillery} · `}{spirit.abv}% · {spirit.volume}ml
                        </div>
                      </div>
                      <span className="material-symbols-outlined">add_circle</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Info & Flavor */}
        <div className={styles.rightCol}>
          {/* Spirit Info Fields */}
          <div className={styles.infoFields}>
            <div className={styles.infoFieldRow}>
              <span className={styles.fieldLabel}>Spirit Name</span>
              <span className={styles.fieldLine}></span>
              <span className={`${styles.fieldValue} ${!formData.name ? styles.empty : ''}`}>
                {formData.name || "Select Spirit"}
              </span>
            </div>
            <div className={styles.infoFieldRow}>
              <span className={styles.fieldLabel}>Category</span>
              <span className={styles.fieldLine}></span>
              <span className={`${styles.fieldValue} ${formData.categoryHierarchy.length === 0 && !formData.category ? styles.empty : ''}`}>
                {formData.categoryHierarchy.length > 0 
                  ? formData.categoryHierarchy.join(' > ') 
                  : (formData.category || "Select Spirit")}
              </span>
            </div>
            <div className={styles.infoFieldRow}>
              <span className={styles.fieldLabel}>Origin</span>
              <span className={styles.fieldLine}></span>
              <span className={`${styles.fieldValue} ${formData.locationHierarchy.length === 0 ? styles.empty : ''}`}>
                {formData.locationHierarchy.length > 0 
                  ? formData.locationHierarchy.join(' > ') 
                  : "Select Spirit"}
              </span>
            </div>
            <div className={styles.infoFieldRow}>
              <span className={styles.fieldLabel}>Distillery</span>
              <span className={styles.fieldLine}></span>
              <span className={`${styles.fieldValue} ${!formData.distillery ? styles.empty : ''}`}>
                {formData.distillery || "Select Spirit"}
              </span>
            </div>
          </div>

            <div className={styles.specsGrid}>
              <div className={styles.specBox}>
                <p className={styles.specLabel}>ABV</p>
                <div className={styles.specValueRow}>
                  <span className={styles.specInput}>
                    {formData.abv || "0.0"}
                  </span>
                  <span>%</span>
                </div>
              </div>
              <div className={styles.specBox}>
                <p className={styles.specLabel}>Volume</p>
                <div className={styles.specValueRow}>
                  <span className={styles.specInput}>
                    {formData.volume || "0"}
                  </span>
                  <span>ml</span>
                </div>
              </div>
            </div>

            {/* Flavor Profile */}
            <div className={styles.flavorCard}>
              <div className={styles.flavorCardHeader}>
                <div>
                  <h3 className={styles.flavorTitle}>Flavor Profile</h3>
                  <p className={styles.flavorSubtitle}>Adjust axes to define the profile</p>
                </div>
                <span className="material-symbols-outlined opacity-40">insights</span>
              </div>

              <div className={styles.flavorVisualSection}>
                {/* Custom Radar Visual (Using polygon based on sliders) */}
                <div className={styles.radarWrapper}>
                  <FlavorRadarChart 
                    data={[
                      { subject: 'Peaty', value: formData.peat || 0 },
                      { subject: 'Floral', value: formData.floral || 0 },
                      { subject: 'Fruity', value: formData.fruity || 0 },
                      { subject: 'Woody', value: formData.woody || 0 },
                      { subject: 'Spicy', value: formData.spicy || 0 },
                      { subject: 'Sweet', value: formData.sweet || 0 },
                    ]} 
                    color="var(--primary)" 
                    height={200} 
                  />
                </div>

                {/* Sliders Grid */}
                <div className={styles.slidersGrid}>
                  {flavorFields.map(field => (
                    <div key={field.name} className={styles.sliderGroup}>
                      <div className={styles.sliderHeader}>
                        <label>{field.label}</label>
                        <span>{formData[field.name]?.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" min="0" max="10" step="0.5"
                        className={styles.rangeInput}
                        value={formData[field.name]}
                        onChange={(e) => handleFlavorChange(field.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasting Notes */}
            <div className={styles.notesCard}>
              <div className={styles.notesHeader}>
                <label className={styles.notesLabel}>Tasting Experience & Notes</label>
              </div>
              <textarea 
                className={styles.notesTextarea}
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                placeholder="Describe the nose, palate, and finish..."
              />
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Button */}
      <div className={styles.fixedFooter}>
        <button 
          className={styles.saveButton}
          onClick={handleSubmit}
          disabled={loading}
        >
          <span className={styles.saveBtnText}>
            {loading ? 'Saving...' : (isEdit ? 'Update Tasting Note' : 'Save Note to Collection')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default NewNote;

